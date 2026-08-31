import Firecrawl from "firecrawl";
import { checkAutoDiscardReason } from "./relevance";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};
const FETCH_TIMEOUT_MS = 10_000;

// Só usado como fallback para páginas que o fetch direto não conseguiu buscar (ver checkJobPages) —
// timeout curto porque isto é sempre best-effort e não pode empatar o refresh todo.
const FIRECRAWL_TIMEOUT_S = 25;
const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Vai buscar o texto completo da página de destino de uma vaga. Devolve null em qualquer falha
// (bloqueio, timeout, 404, rede em baixo) — nunca deve rebentar o refresh nem ser interpretado como
// "sem desqualificadores", só como "não foi possível verificar".
async function fetchPageText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const html = await res.text();
    return htmlToText(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type AutoDiscardResult = { autoExcluded: boolean; reason: string | null };

function toResult(text: string): AutoDiscardResult {
  const reason = checkAutoDiscardReason(text);
  return { autoExcluded: reason !== null, reason };
}

// Chamado só para jobs recém-criados (ver refresh.ts) — busca a página de destino de cada um e corre
// as regras de src/lib/sources/relevance.ts sobre o texto completo.
//
// Muitas páginas de destino (Greenhouse, Lever, e outros ATS, tal como o próprio Indeed — ver
// indeed.ts) bloqueiam pedidos vindos de IPs de datacenter mesmo com headers de browser. O fetch
// direto (grátis) é sempre tentado primeiro; só as que falharem passam por UM único batchScrape do
// Firecrawl (pago) para todas juntas, em vez de um pedido por vaga — respeita o rate limit do
// Firecrawl e mantém o custo controlado. Falha sempre em silêncio: uma página que continue
// inacessível mesmo via Firecrawl nunca marca a vaga como excluída, só fica por verificar.
export async function checkJobPages(urls: string[]): Promise<Map<string, AutoDiscardResult>> {
  const results = new Map<string, AutoDiscardResult>();
  const blocked: string[] = [];

  await Promise.all(
    urls.map(async (url) => {
      const text = await fetchPageText(url);
      if (text === null) {
        blocked.push(url);
        return;
      }
      results.set(url, toResult(text));
    }),
  );

  if (blocked.length > 0) {
    try {
      const job = await firecrawl.batchScrape(blocked, {
        options: { formats: ["rawHtml"] },
        pollInterval: 2,
        timeout: FIRECRAWL_TIMEOUT_S,
      });
      for (const doc of job.data) {
        const sourceUrl = doc.metadata?.sourceURL ?? doc.metadata?.url;
        if (!sourceUrl || !doc.rawHtml) continue;
        results.set(sourceUrl, toResult(htmlToText(doc.rawHtml)));
      }
    } catch {
      // Firecrawl esgotou o tempo ou falhou (ex: rate limit) — as vagas em `blocked` ficam por
      // verificar, tal como qualquer outra falha de fetch.
    }
  }

  return results;
}

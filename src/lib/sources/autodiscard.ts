import { checkAutoDiscardReason } from "./relevance";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};
const FETCH_TIMEOUT_MS = 10_000;

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

// Chamado só para jobs recém-criados (ver refresh.ts) — busca a página de destino e corre as regras
// de src/lib/sources/relevance.ts sobre o texto completo. Falha em silêncio: um fetch bloqueado
// nunca marca a vaga como excluída, só fica por verificar.
export async function checkJobPage(url: string): Promise<AutoDiscardResult> {
  const text = await fetchPageText(url);
  if (text === null) return { autoExcluded: false, reason: null };

  const reason = checkAutoDiscardReason(text);
  return { autoExcluded: reason !== null, reason };
}

import { classifyArea, detectRemoteType, hasAiSignal, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

const BASE_URL = "https://pt.indeed.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

// O Indeed só devolve resultados sem autenticação na 1ª página de cada pesquisa — pedir start=10+
// redireciona para uma página de login ("page-two-signin"). Por isso não há paginação aqui: cada
// pesquisa dá no máximo ~15 vagas, e cobrimos mais terreno com várias pesquisas em vez de páginas.
const QUERIES = ["programador", "informática"];

const JOBCARDS_MARKER = 'mosaic.providerData["mosaic-provider-jobcards"]=';

// Os resultados vêm embutidos num bloco JS (não JSON puro) dentro da página — isto isola o objeto,
// respeitando strings para não parar num "{"/"}" que apareça dentro de um snippet de texto.
function extractJsonObject(text: string, startIdx: number): string | undefined {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return undefined;
}

type IndeedResult = {
  jobkey?: string;
  title?: string;
  displayTitle?: string;
  company?: string;
  formattedLocation?: string;
  createDate?: number;
  remoteLocation?: boolean;
};

async function fetchQuery(query: string): Promise<IndeedResult[]> {
  const params = new URLSearchParams({ q: query, l: "Portugal" });
  const res = await fetch(`${BASE_URL}/jobs?${params.toString()}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Indeed devolveu ${res.status} para "${query}"`);

  const html = await res.text();
  const markerIdx = html.indexOf(JOBCARDS_MARKER);
  if (markerIdx === -1) {
    throw new Error("Indeed bloqueou o pedido (página sem dados — possível CAPTCHA/login exigido)");
  }

  const json = extractJsonObject(html, markerIdx + JOBCARDS_MARKER.length);
  if (!json) throw new Error("Indeed devolveu uma resposta inesperada (JSON incompleto)");

  const data = JSON.parse(json) as {
    metaData?: { mosaicProviderJobCardsModel?: { results?: IndeedResult[] } };
  };
  const results = data.metaData?.mosaicProviderJobCardsModel?.results;
  return Array.isArray(results) ? results : [];
}

export const fetchIndeed: Fetcher = async () => {
  const jobs: NormalizedJob[] = [];
  const seenIds = new Set<string>();
  let anySucceeded = false;

  for (const query of QUERIES) {
    let results: IndeedResult[];
    try {
      results = await fetchQuery(query);
      anySucceeded = true;
    } catch {
      // Esta pesquisa foi bloqueada — tenta as restantes em vez de desistir do refresh todo.
      continue;
    }

    for (const item of results) {
      const title = (item.title || item.displayTitle || "").trim();
      if (!item.jobkey || !title || seenIds.has(item.jobkey)) continue;
      if (!isItRelevant(title)) continue;
      seenIds.add(item.jobkey);

      const haystack = `${title} ${item.formattedLocation ?? ""}`;
      const tags: string[] = [];
      if (hasAiSignal(haystack)) tags.push("AI");

      jobs.push({
        externalId: item.jobkey,
        title,
        company: item.company || "Desconhecida",
        location: item.formattedLocation,
        remoteType: item.remoteLocation ? "REMOTO" : detectRemoteType(haystack),
        country: "Portugal",
        area: classifyArea(haystack),
        tags,
        isInternship: /estágio|estagiári|trainee/i.test(title),
        url: `${BASE_URL}/viewjob?jk=${item.jobkey}`,
        publishedAt: item.createDate ? new Date(item.createDate) : undefined,
      });
    }
  }

  if (!anySucceeded) {
    throw new Error("Indeed bloqueou todos os pedidos (possível CAPTCHA/login exigido) — tenta mais tarde");
  }

  return jobs;
};

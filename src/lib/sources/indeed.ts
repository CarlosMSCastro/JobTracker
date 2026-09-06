import { detectRemoteType, hasAiSignal, isEventsRelevant, isItRelevant } from "./relevance";
import { batchFetchHtml } from "./scrape";
import type { Fetcher, NormalizedJob } from "./types";

const BASE_URL = "https://pt.indeed.com";

// O Indeed só devolve resultados sem autenticação na 1ª página de cada pesquisa — pedir start=10+
// redireciona para uma página de login ("page-two-signin"). Por isso não há paginação aqui: cada
// pesquisa dá no máximo ~15 vagas, e cobrimos mais terreno com várias pesquisas em vez de páginas.
const QUERIES = ["programador", "informática"];
const KAROL_QUERIES = ["gestão de eventos", "marketing", "turismo"];

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

function queryUrl(query: string): string {
  const params = new URLSearchParams({ q: query, l: "Portugal" });
  return `${BASE_URL}/jobs?${params.toString()}`;
}

function parseResults(html: string): IndeedResult[] {
  const markerIdx = html.indexOf(JOBCARDS_MARKER);
  if (markerIdx === -1) return [];

  const json = extractJsonObject(html, markerIdx + JOBCARDS_MARKER.length);
  if (!json) return [];

  const data = JSON.parse(json) as {
    metaData?: { mosaicProviderJobCardsModel?: { results?: IndeedResult[] } };
  };
  const results = data.metaData?.mosaicProviderJobCardsModel?.results;
  return Array.isArray(results) ? results : [];
}

export const fetchIndeed: Fetcher = async (config) => {
  const jobs: NormalizedJob[] = [];
  const seenIds = new Set<string>();
  const isKarol = config.profile === "KAROL";
  const isRelevant = isKarol ? isEventsRelevant : isItRelevant;

  const urls = (isKarol ? KAROL_QUERIES : QUERIES).map(queryUrl);
  // Ao contrário do net-empregos.com, o Indeed bloqueia (403) mesmo pedidos vindos de rede doméstica
  // — confirmado ao testar o fetch direto localmente — por isso usa sempre o Firecrawl, mesmo fora
  // da Vercel.
  const htmlByUrl = await batchFetchHtml(urls, { forceFirecrawl: true });

  const allResults: IndeedResult[] = [];
  for (const html of htmlByUrl.values()) {
    allResults.push(...parseResults(html));
  }

  if (htmlByUrl.size > 0 && allResults.length === 0) {
    throw new Error("Indeed bloqueou todos os pedidos (possível CAPTCHA/login exigido, ou mudou o formato da página)");
  }

  for (const item of allResults) {
    const title = (item.title || item.displayTitle || "").trim();
    if (!item.jobkey || !title || seenIds.has(item.jobkey)) continue;
    if (!isRelevant(title)) continue;
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
      tags,
      isInternship: /estágio|estagiári|trainee/i.test(title),
      url: `${BASE_URL}/viewjob?jk=${item.jobkey}`,
      publishedAt: item.createDate ? new Date(item.createDate) : undefined,
    });
  }

  return jobs;
};

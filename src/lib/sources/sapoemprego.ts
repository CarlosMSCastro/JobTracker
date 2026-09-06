import { detectRemoteType, hasAiSignal, isEventsRelevant, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

// Pesquisas cobrindo as áreas do perfil de Carlos (dev/TI, suporte, administrativo) — o Sapo
// Emprego é generalista, por isso cada resultado ainda passa por isItRelevant() como filtro.
const QUERIES = ["informática", "suporte técnico", "administrativo"];
const KAROL_QUERIES = ["eventos", "turismo", "marketing", "comunicação", "administrativo"];
const MAX_PAGES = 3;
const BASE_URL = "https://emprego.sapo.pt";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
};
const INTERNSHIP_KEYWORDS = ["estágio", "estagiário", "estagiária", "trainee"];

type SapoOffer = {
  id: string;
  publication_date?: string;
  location?: string;
  offer_name: string;
  job_description?: string;
  company_name?: string;
  remote_work?: boolean;
  link: string;
};

type SapoSearchResponse = {
  offers?: SapoOffer[];
  pagination?: { total: number; page: number; size: number };
};

async function fetchPage(query: string, page: number): Promise<SapoSearchResponse | undefined> {
  const params = new URLSearchParams({ pesquisa: query, page: String(page) });
  const res = await fetch(`${BASE_URL}/offers/search?${params.toString()}`, { headers: HEADERS });
  if (!res.ok) return undefined;
  return (await res.json()) as SapoSearchResponse;
}

export const fetchSapoEmprego: Fetcher = async (config) => {
  const jobs: NormalizedJob[] = [];
  const seenIds = new Set<string>();
  const isKarol = config.profile === "KAROL";
  const queries = isKarol ? KAROL_QUERIES : QUERIES;
  const isRelevant = isKarol ? isEventsRelevant : isItRelevant;

  for (const query of queries) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await fetchPage(query, page);
      const offers = data?.offers ?? [];
      if (offers.length === 0) break;

      for (const offer of offers) {
        if (!offer.id || !offer.offer_name) continue;
        if (seenIds.has(offer.id) || !isRelevant(offer.offer_name)) continue;
        seenIds.add(offer.id);

        const haystack = `${offer.offer_name} ${offer.location ?? ""}`;
        const tags: string[] = [];
        if (hasAiSignal(haystack)) tags.push("AI");

        jobs.push({
          externalId: offer.id,
          title: offer.offer_name,
          company: offer.company_name || "Desconhecida",
          location: offer.location,
          remoteType: offer.remote_work ? "REMOTO" : detectRemoteType(haystack),
          tags,
          isInternship: INTERNSHIP_KEYWORDS.some((kw) => offer.offer_name.toLowerCase().includes(kw)),
          url: offer.link,
          publishedAt: offer.publication_date ? new Date(offer.publication_date) : undefined,
        });
      }

      const total = data?.pagination?.total ?? 0;
      if (page * (data?.pagination?.size || offers.length) >= total) break;
    }
  }

  return jobs;
};

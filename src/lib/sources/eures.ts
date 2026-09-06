import { htmlToText } from "./autodiscard";
import { detectRemoteType, hasAiSignal, isEventsRelevant, isGermanMarketJob, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

// Pesquisas cobrindo as áreas do perfil de Carlos — a EURES agrega vagas de toda a UE, por isso
// cada resultado ainda passa por isItRelevant() como filtro, mesmo já pedindo locationCodes: ["pt"].
const KEYWORDS = ["informática", "programador", "suporte técnico", "administrativo"];
const KAROL_KEYWORDS = ["eventos", "turismo", "marketing", "relações públicas", "administrativo"];
const PAGES = 2;
const RESULTS_PER_PAGE = 20;
const SEARCH_URL = "https://europa.eu/eures/api/jv-searchengine/public/jv-search/search";
const INTERNSHIP_KEYWORDS = ["estágio", "estagiário", "estagiária", "trainee"];

// API pública sem autenticação — descoberta inspecionando os pedidos de rede feitos pelo portal
// (europa.eu/eures/portal/jv-se), não documentada oficialmente. Pode mudar sem aviso.
type EuresSearchBody = {
  resultsPerPage: number;
  page: number;
  sortSearch: "BEST_MATCH";
  keywords: { keyword: string; specificSearchCode: "EVERYWHERE" }[];
  publicationPeriod: null;
  occupationUris: [];
  skillUris: [];
  requiredExperienceCodes: [];
  positionScheduleCodes: [];
  sectorCodes: [];
  educationAndQualificationLevelCodes: [];
  positionOfferingCodes: [];
  locationCodes: string[];
  euresFlagCodes: [];
  otherBenefitsCodes: [];
  requiredLanguages: [];
  minNumberPost: null;
  userPreferredLanguage: null;
  requestLanguage: string;
};

type EuresJv = {
  id: string;
  title: string;
  description?: string;
  creationDate?: number;
  employer?: { name?: string } | null;
  locationMap?: Record<string, (string | null)[]>;
};

// Nomes das regiões NUTS de Portugal (todos os níveis, incluindo revisões 2016 e 2021 — a API mistura
// códigos das duas), extraídos do bundle de tradução do próprio portal
// (europa.eu/eures/api/shared-data-rest-api/public/i18n/pt/...), chaves "global.nuts.PT*". Não há
// endpoint de referência dedicado para isto — só existe como texto de UI.
const NUTS_PT: Record<string, string> = {
  PT: "Portugal",
  PT1: "Portugal Continental",
  PT2: "Açores",
  PT3: "Madeira",
  PT11: "Norte",
  PT111: "Alto Minho",
  PT112: "Cávado",
  PT119: "Ave",
  PT11A: "Área Metropolitana do Porto",
  PT11B: "Alto Tâmega e Barroso",
  PT11C: "Tâmega e Sousa",
  PT11D: "Douro",
  PT11E: "Terras de Trás-os-Montes",
  PT15: "Algarve",
  PT150: "Algarve",
  PT16: "Centro (PT)",
  PT16B: "Ocidental",
  PT16D: "Região de Aveiro",
  PT16E: "Região de Coimbra",
  PT16F: "Região de Leiria",
  PT16G: "Viseu Dão Lafões",
  PT16H: "Beira Baixa",
  PT16I: "Médio Tejo",
  PT16J: "Beiras e Serra da Estrela",
  PT17: "Área Metropolitana de Lisboa",
  PT170: "Área Metropolitana de Lisboa",
  PT18: "Alentejo",
  PT181: "Costa Alentejana",
  PT184: "Baixo Alentejo",
  PT185: "Lezíria do Tejo",
  PT186: "Alto Alentejo",
  PT187: "Alentejo Central",
  PT19: "Centro (PT)",
  PT191: "Região de Aveiro",
  PT192: "Região de Coimbra",
  PT193: "Região de Leiria",
  PT194: "Viseu Dão Lafões",
  PT195: "Beira Baixa",
  PT196: "Beiras e Serra da Estrela",
  PT1A: "Grande Lisboa",
  PT1A0: "Greater Lisbon",
  PT1B: "Península de Setúbal",
  PT1B0: "Setúbal Peninsula",
  PT1C: "Alentejo",
  PT1C1: "Costa Alentejana",
  PT1C2: "Baixo Alentejo",
  PT1C3: "Alto Alentejo",
  PT1C4: "Médio Tejo",
  PT1D: "Oeste e Vale do Tejo",
  PT1D1: "Ocidental",
  PT1D2: "Médio Tejo",
  PT1D3: "Lezíria do Tejo",
  PT20: "Açores",
  PT200: "Açores",
  PT30: "Madeira",
  PT300: "Madeira",
};

function resolveLocation(locationMap: EuresJv["locationMap"]): string | undefined {
  const code = locationMap?.PT?.find((c): c is string => c !== null);
  if (!code) return locationMap?.PT ? "Portugal" : undefined;
  return NUTS_PT[code.toUpperCase()] ?? "Portugal";
}

type EuresSearchResponse = { numberRecords: number; jvs?: EuresJv[] };

function searchBody(keyword: string, page: number): EuresSearchBody {
  return {
    resultsPerPage: RESULTS_PER_PAGE,
    page,
    sortSearch: "BEST_MATCH",
    keywords: [{ keyword, specificSearchCode: "EVERYWHERE" }],
    publicationPeriod: null,
    occupationUris: [],
    skillUris: [],
    requiredExperienceCodes: [],
    positionScheduleCodes: [],
    sectorCodes: [],
    educationAndQualificationLevelCodes: [],
    positionOfferingCodes: [],
    locationCodes: ["pt"],
    euresFlagCodes: [],
    otherBenefitsCodes: [],
    requiredLanguages: [],
    minNumberPost: null,
    userPreferredLanguage: null,
    requestLanguage: "pt",
  };
}

async function fetchPage(keyword: string, page: number): Promise<EuresJv[]> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(searchBody(keyword, page)),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as EuresSearchResponse;
  return data.jvs ?? [];
}

export const fetchEures: Fetcher = async (config) => {
  const jobs: NormalizedJob[] = [];
  const seenIds = new Set<string>();
  const isKarol = config.profile === "KAROL";
  const keywords = isKarol ? KAROL_KEYWORDS : KEYWORDS;
  const isRelevant = isKarol ? isEventsRelevant : isItRelevant;

  for (const keyword of keywords) {
    for (let page = 1; page <= PAGES; page++) {
      const jvs = await fetchPage(keyword, page);
      if (jvs.length === 0) break;

      for (const jv of jvs) {
        if (seenIds.has(jv.id) || !isRelevant(jv.title)) continue;
        seenIds.add(jv.id);

        const descriptionText = jv.description ? htmlToText(jv.description) : undefined;
        const haystack = `${jv.title} ${descriptionText ?? ""}`;

        // A EURES agrega vagas de toda a UE, não só Portugal — locationCodes: ["pt"] não impede vagas
        // do mercado alemão/DACH (confirmado: "Front-End Developer (m/f/d)" da retarus GmbH passou
        // no isItRelevant() por ser de dev, mas é claramente alemã). Mesmo sinal usado no Arbeitnow.
        if (isGermanMarketJob(haystack)) continue;

        const tags: string[] = [];
        if (hasAiSignal(haystack)) tags.push("AI");

        const location = resolveLocation(jv.locationMap);

        jobs.push({
          externalId: jv.id,
          title: jv.title,
          company: jv.employer?.name || "Desconhecida",
          location,
          remoteType: detectRemoteType(`${haystack} ${location ?? ""}`),
          tags,
          isInternship: INTERNSHIP_KEYWORDS.some((kw) => jv.title.toLowerCase().includes(kw)),
          url: `https://europa.eu/eures/portal/jv-se/jv-details/${jv.id}?lang=pt`,
          publishedAt: jv.creationDate ? new Date(jv.creationDate) : undefined,
          descriptionText,
        });
      }
    }
  }

  return jobs;
};

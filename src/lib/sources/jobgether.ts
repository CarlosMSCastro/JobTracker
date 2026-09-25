import { MAX_AGE_DAYS } from "../cleanup";
import { hasAiSignal, isEventsRelevant, isGermanMarketJob, isItRelevant, isSalesLike } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type JobgetherJob = {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  remote: string;
  contractType: string;
  experience: string;
  jobFunctions: string[];
  postedAt: string;
};

type JobgetherResponse = {
  jobs: JobgetherJob[];
  pagination: { page: number; limit: number; hasMore: boolean };
};

// API pública e sem chave, feita para agentes (docs em /astroapi/ai/jobs/docs, explicitamente
// permitida no robots.txt). Limites do servidor: 25 resultados por página, 10 páginas por pesquisa,
// 60 pedidos/minuto. "locations=portugal" já só devolve vagas elegíveis a partir de Portugal
// (Portugal, Europe, EMEA, Anywhere...) e todas são Full Remote por omissão.
const API_URL = "https://jobgether.com/api/v1/jobs";
const PAGE_SIZE = 25;

// Pede-se por país + nível e filtra-se localmente, como na Remotive. Carlos é júnior: só
// entrada/júnior (~50 vagas/semana, 4 páginas ≈ 12 dias, alinhado com a limpeza de 14 dias em
// cleanup.ts). Karol já tem experiência, por isso inclui intermédio — mas aí o volume é tanto
// (~125/dia, só ~3% da área dela) que as páginas por nível só cobrem ~1 dia. As pesquisas por
// `keyword` estendem essa janela; são difusas ("developer" devolve "Business Development"), mas
// isso não faz mal porque tudo passa pelo filtro de relevância na mesma.
type Query = { experience: string; keyword?: string; maxPages: number };
const JUNIOR = "entry-level-graduate,junior-1-2-years";
const CARLOS_QUERIES: Query[] = [{ experience: JUNIOR, maxPages: 4 }];
const KAROL_QUERIES: Query[] = [
  { experience: `${JUNIOR},mid-level-2-5-years`, maxPages: 4 },
  { experience: `${JUNIOR},mid-level-2-5-years`, keyword: "marketing", maxPages: 4 },
  { experience: `${JUNIOR},mid-level-2-5-years`, keyword: "event", maxPages: 2 },
];

// \b evita apanhar "international"/"internal".
const INTERNSHIP_RE = /\bintern(ship)?s?\b|estágio|estagiári[oa]|trainee/i;

async function fetchPages({ experience, keyword, maxPages }: Query): Promise<JobgetherJob[]> {
  const all: JobgetherJob[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({
      locations: "portugal",
      experience,
      sort: "date",
      limit: String(PAGE_SIZE),
      page: String(page),
      ...(keyword ? { keyword } : {}),
    });
    const res = await fetch(`${API_URL}?${params}`);
    if (!res.ok) break;
    const data = (await res.json()) as JobgetherResponse;
    all.push(...(data.jobs ?? []));
    if (!data.pagination?.hasMore) break;
  }
  return all;
}

export const fetchJobgether: Fetcher = async (config) => {
  const isKarol = config.profile === "KAROL";
  const isRelevant = isKarol ? isEventsRelevant : isItRelevant;
  const queries = isKarol ? KAROL_QUERIES : CARLOS_QUERIES;
  // Sequencial de propósito: no máximo 10 pedidos no total, bem abaixo dos 60/minuto da API.
  const results: JobgetherJob[] = [];
  for (const query of queries) results.push(...(await fetchPages(query)));

  // As pesquisas por keyword recuam semanas — sem este corte, vagas já apagadas pela limpeza por
  // idade (cleanup.ts) voltavam a entrar como novas a cada refresh.
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const jobs: NormalizedJob[] = [];

  for (const job of results) {
    if (seen.has(job.id) || new Date(job.postedAt).getTime() < cutoff) continue;
    seen.add(job.id);

    const haystack = `${job.title} ${job.jobFunctions?.join(" ") ?? ""}`;
    if (!isRelevant(haystack) || isSalesLike(job.title)) continue;
    // "Anywhere" inclui estágios/Ausbildung alemães presenciais (ex: "Praktikum ... (m/w/d)").
    if (isGermanMarketJob(job.title)) continue;

    const tags = [...(job.jobFunctions ?? [])];
    if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

    jobs.push({
      externalId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      remoteType: job.remote.toLowerCase().includes("hybrid") ? "HIBRIDO" : "REMOTO",
      tags,
      isInternship: job.contractType === "Internships" || INTERNSHIP_RE.test(job.title),
      url: job.url,
      publishedAt: job.postedAt ? new Date(job.postedAt) : undefined,
    });
  }

  return jobs;
};

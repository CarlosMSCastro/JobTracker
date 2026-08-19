import { classifyArea, hasAiSignal, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  candidate_required_location: string;
  publication_date: string;
};

type RemotiveResponse = {
  jobs: RemotiveJob[];
};

// A query param `category=` da API pública da Remotive está atualmente a ser ignorada pelo servidor
// (devolve sempre todos os jobs, independentemente do valor). Por isso pedimos tudo e filtramos
// pelo campo `category` de cada job em vez de confiar no parâmetro.
const DEV_CATEGORIES = new Set([
  "Software Development",
  "Data",
  "Devops",
  "Quality Assurance",
  "Artificial Intelligence",
  "Information Technology",
]);

// Categoria separada da Remotive — só entra se passar no filtro de suporte-sem-vendas, para não
// trazer todo o tipo de apoio ao cliente genérico (ex: vendas disfarçadas de "customer success").
const SUPPORT_CATEGORY = "Customer Service";

export const fetchRemotive: Fetcher = async () => {
  const res = await fetch("https://remotive.com/api/remote-jobs");
  if (!res.ok) return [];
  const data = (await res.json()) as RemotiveResponse;

  const jobs: NormalizedJob[] = [];

  for (const job of data.jobs) {
    const haystack = `${job.title} ${job.category} ${job.tags?.join(" ") ?? ""}`;
    const isDevCategory = DEV_CATEGORIES.has(job.category);
    const isRelevantSupport = job.category === SUPPORT_CATEGORY && isItRelevant(haystack);
    if (!isDevCategory && !isRelevantSupport) continue;

    const tags = job.tags ?? [];
    if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

    jobs.push({
      externalId: String(job.id),
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location,
      remoteType: "REMOTO",
      area: classifyArea(haystack),
      tags,
      url: job.url,
      publishedAt: job.publication_date ? new Date(job.publication_date) : undefined,
    });
  }

  return jobs;
};

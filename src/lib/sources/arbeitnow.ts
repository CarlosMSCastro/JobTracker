import { detectRemoteType, hasAiSignal, isGermanMarketJob, isItRelevant, isPortugalLocation } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
};

type ArbeitnowResponse = {
  data: ArbeitnowJob[];
};

export const fetchArbeitnow: Fetcher = async () => {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
  if (!res.ok) return [];
  const data = (await res.json()) as ArbeitnowResponse;

  const jobs: NormalizedJob[] = [];
  for (const job of data.data) {
    const haystack = `${job.title} ${job.tags?.join(" ") ?? ""} ${job.job_types?.join(" ") ?? ""}`;
    if (!isItRelevant(haystack)) continue;

    // Dominado por vagas do mercado alemão/DACH ("(m/w/d)", "Mitarbeiter", etc.) — nem sempre óbvio
    // a olho, e o filtro de país (isPortugalLocation) só se aplica a vagas presenciais/híbridas
    // (remoto passa sempre esse). Aplica-se aqui, antes de decidir presencial/remoto, porque exclui
    // independentemente da modalidade.
    if (isGermanMarketJob(haystack)) continue;

    const remoteType = job.remote ? "REMOTO" : detectRemoteType(haystack);

    // Arbeitnow não indica país e é dominado por vagas na Alemanha/Reino Unido — uma vaga presencial
    // ou híbrida noutro país não serve para nada aqui; remoto passa sempre (não exige mudança).
    if (remoteType !== "REMOTO" && !isPortugalLocation(job.location ?? "")) continue;

    const tags = job.tags ?? [];
    if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

    jobs.push({
      externalId: job.slug,
      title: job.title,
      company: job.company_name,
      location: job.location,
      remoteType,
      tags,
      url: job.url,
      publishedAt: job.created_at ? new Date(job.created_at * 1000) : undefined,
    });
  }

  return jobs;
};

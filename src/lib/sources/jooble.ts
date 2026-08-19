import { classifyArea, detectRemoteType, hasAiSignal } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type JoobleJob = {
  title: string;
  location: string;
  snippet: string;
  link: string;
  company: string;
  updated: string;
};

type JoobleResponse = {
  jobs: JoobleJob[];
};

// Atenção: a chave grátis da Jooble tem um limite VITALÍCIO de 500 pedidos (não mensal).
// Esta fonte deve ficar `active: false` por defeito — ativa-a manualmente só quando quiseres gastar uma chamada.
export const fetchJooble: Fetcher = async (config) => {
  const apiKey = config.apiKey;
  if (!apiKey) return [];

  const res = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keywords: "programador OR developer OR informática OR helpdesk OR suporte informático",
      location: "Portugal",
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as JoobleResponse;

  const jobs: NormalizedJob[] = [];
  for (const job of data.jobs ?? []) {
    const haystack = `${job.title} ${job.snippet ?? ""}`;
    const tags = hasAiSignal(haystack) ? ["AI"] : [];

    jobs.push({
      title: job.title,
      company: job.company || "Desconhecida",
      location: job.location,
      remoteType: detectRemoteType(`${job.title} ${job.location ?? ""}`),
      country: "Portugal",
      area: classifyArea(haystack),
      tags,
      url: job.link,
      publishedAt: job.updated ? new Date(job.updated) : undefined,
    });
  }

  return jobs;
};

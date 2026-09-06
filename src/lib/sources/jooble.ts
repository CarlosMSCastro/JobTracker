import { detectRemoteType, hasAiSignal } from "./relevance";
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

const KEYWORDS = "programador OR developer OR informática OR helpdesk OR suporte informático";
const KAROL_KEYWORDS = "gestão de eventos OR marketing OR turismo OR hotelaria OR relações públicas OR administrativo";

// Atenção: a chave grátis da Jooble tem um limite VITALÍCIO de 500 pedidos (não mensal), partilhado
// entre a fonte do Carlos e a da Karol (mesma chave). Esta fonte deve ficar `active: false` por
// defeito nos dois perfis — ativa-a manualmente só quando quiseres gastar uma chamada.
export const fetchJooble: Fetcher = async (config) => {
  const apiKey = config.apiKey;
  if (!apiKey) return [];

  const res = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keywords: config.profile === "KAROL" ? KAROL_KEYWORDS : KEYWORDS,
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
      tags,
      url: job.link,
      publishedAt: job.updated ? new Date(job.updated) : undefined,
    });
  }

  return jobs;
};

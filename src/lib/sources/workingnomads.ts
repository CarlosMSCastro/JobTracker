import { hasAiSignal, isEventsRelevant, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type WorkingNomadsJob = {
  url: string;
  title: string;
  company_name: string;
  category_name: string;
  tags: string;
  location: string;
  pub_date: string;
};

export const fetchWorkingNomads: Fetcher = async (config) => {
  const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/");
  if (!res.ok) return [];

  const isKarol = config.profile === "KAROL";
  const isRelevant = isKarol ? isEventsRelevant : isItRelevant;
  // Categorias reais desta fonte: "Marketing" existe, tal como "Development" existe para o Carlos.
  const trustedCategory = isKarol ? "Marketing" : "Development";

  const data = (await res.json()) as WorkingNomadsJob[];
  const jobs: NormalizedJob[] = [];

  for (const job of data) {
    const isTrustedCategory = job.category_name === trustedCategory;
    if (!isTrustedCategory && !isRelevant(job.title)) continue;

    const haystack = `${job.title} ${job.tags ?? ""}`;
    const tags = job.tags ? job.tags.split(",").map((t) => t.trim()) : [];
    if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

    jobs.push({
      title: job.title,
      company: job.company_name || "Desconhecida",
      location: job.location || undefined,
      remoteType: "REMOTO",
      tags,
      url: job.url,
      publishedAt: job.pub_date ? new Date(job.pub_date) : undefined,
    });
  }

  return jobs;
};

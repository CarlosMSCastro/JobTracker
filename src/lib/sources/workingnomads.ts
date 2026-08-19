import { classifyArea, hasAiSignal, isItRelevant } from "./relevance";
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

export const fetchWorkingNomads: Fetcher = async () => {
  const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/");
  if (!res.ok) return [];

  const data = (await res.json()) as WorkingNomadsJob[];
  const jobs: NormalizedJob[] = [];

  for (const job of data) {
    const isDevCategory = job.category_name === "Development";
    if (!isDevCategory && !isItRelevant(job.title)) continue;

    const haystack = `${job.title} ${job.tags ?? ""}`;
    const tags = job.tags ? job.tags.split(",").map((t) => t.trim()) : [];
    if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

    jobs.push({
      title: job.title,
      company: job.company_name || "Desconhecida",
      location: job.location || undefined,
      remoteType: "REMOTO",
      area: classifyArea(haystack),
      tags,
      url: job.url,
      publishedAt: job.pub_date ? new Date(job.pub_date) : undefined,
    });
  }

  return jobs;
};

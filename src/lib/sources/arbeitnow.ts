import { classifyArea, detectRemoteType, hasAiSignal, isItRelevant } from "./relevance";
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

    const tags = job.tags ?? [];
    if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

    jobs.push({
      externalId: job.slug,
      title: job.title,
      company: job.company_name,
      location: job.location,
      remoteType: job.remote ? "REMOTO" : detectRemoteType(haystack),
      area: classifyArea(haystack),
      tags,
      url: job.url,
      publishedAt: job.created_at ? new Date(job.created_at * 1000) : undefined,
    });
  }

  return jobs;
};

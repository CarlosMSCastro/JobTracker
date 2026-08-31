import { detectRemoteType, hasAiSignal } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type ItJobsResult = {
  id: number;
  title: string;
  company: { name: string };
  body?: string;
  locations?: { name: string }[];
  publishedAt?: string;
  slug: string;
};

type ItJobsResponse = {
  total: number;
  results: ItJobsResult[];
};

function detectTags(title: string, body: string | undefined): string[] {
  const tags: string[] = [];
  if (hasAiSignal(`${title} ${body ?? ""}`)) tags.push("AI");
  return tags;
}

export const fetchItJobs: Fetcher = async (config) => {
  const apiKey = config.apiKey;
  if (!apiKey) return [];

  const jobs: NormalizedJob[] = [];
  let page = 1;
  const limit = 50;

  while (true) {
    const res = await fetch("https://api.itjobs.pt/job/list.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: apiKey, limit: String(limit), page: String(page) }),
    });

    if (!res.ok) break;
    const data = (await res.json()) as ItJobsResponse;

    for (const result of data.results) {
      const location = result.locations?.map((l) => l.name).join(", ");
      jobs.push({
        externalId: String(result.id),
        title: result.title,
        company: result.company?.name ?? "Desconhecida",
        location,
        remoteType: detectRemoteType(`${result.title} ${location ?? ""}`),
        tags: detectTags(result.title, result.body),
        url: `https://www.itjobs.pt/oferta/${result.id}/${result.slug}`,
        publishedAt: result.publishedAt ? new Date(result.publishedAt) : undefined,
      });
    }

    if (data.results.length < limit || jobs.length >= data.total || page >= 5) break;
    page += 1;
  }

  return jobs;
};

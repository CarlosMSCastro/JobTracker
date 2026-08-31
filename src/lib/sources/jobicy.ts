import { hasAiSignal, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobIndustry: string[];
  jobGeo: string;
  pubDate: string;
};

type JobicyResponse = {
  jobs: JobicyJob[];
};

// Slugs reais da Jobicy (ver /api/v2/remote-jobs?get=industries). "supporting" é apoio ao
// cliente genérico, por isso passa pelo filtro de suporte-sem-vendas antes de entrar.
const DEV_INDUSTRIES = ["engineering", "admin", "qa-testing", "cybersecurity", "data-science", "web-app-design"];
const SUPPORT_INDUSTRY = "technical-support";

export const fetchJobicy: Fetcher = async () => {
  const industries = [...DEV_INDUSTRIES, SUPPORT_INDUSTRY];

  const responses = await Promise.all(
    industries.map((industry) =>
      fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&industry=${industry}`).then((res) =>
        res.ok ? (res.json() as Promise<JobicyResponse>) : { jobs: [] },
      ),
    ),
  );

  const seen = new Set<number>();
  const jobs: NormalizedJob[] = [];

  responses.forEach((data, i) => {
    const industry = industries[i];
    for (const job of data.jobs ?? []) {
      if (seen.has(job.id)) continue;

      const haystack = `${job.jobTitle} ${job.jobIndustry?.join(" ") ?? ""}`;
      if (industry === SUPPORT_INDUSTRY && !isItRelevant(haystack)) continue;

      seen.add(job.id);
      const tags: string[] = [];
      if (hasAiSignal(haystack)) tags.push("AI");

      jobs.push({
        externalId: String(job.id),
        title: job.jobTitle,
        company: job.companyName,
        location: job.jobGeo,
        remoteType: "REMOTO",
        tags,
        url: job.url,
        publishedAt: job.pubDate ? new Date(job.pubDate) : undefined,
      });
    }
  });

  return jobs;
};

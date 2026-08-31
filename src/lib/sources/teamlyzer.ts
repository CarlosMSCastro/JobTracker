import { detectRemoteType, hasAiSignal } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type TeamlyzerJob = {
  identifier: string;
  title: string;
  hiringOrganization?: { name?: string };
  jobLocation?: { address?: { addressLocality?: string } };
  occupationalCategory?: string;
  skills?: string[];
  url: string;
  datePosted?: string;
};

type ItemList = {
  "@type": string;
  itemListElement: { item: TeamlyzerJob }[];
};

const PAGES = 4; // ~43 vagas/página — dá boa cobertura sem exagerar em pedidos
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const INTERNSHIP_KEYWORDS = ["estágio", "estagiário", "estagiária", "trainee", "internship"];

function extractJobs(html: string): TeamlyzerJob[] {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

  for (const [, content] of scripts) {
    if (!content.includes('"ItemList"')) continue;
    try {
      const data = JSON.parse(content) as ItemList;
      return data.itemListElement.map((el) => el.item);
    } catch {
      return [];
    }
  }

  return [];
}

export const fetchTeamlyzer: Fetcher = async () => {
  const responses = await Promise.all(
    Array.from({ length: PAGES }, (_, i) => i + 1).map((page) =>
      fetch(`https://pt.teamlyzer.com/companies/jobs?page=${page}`, { headers: HEADERS }).then((res) =>
        res.ok ? res.text() : "",
      ),
    ),
  );

  const seen = new Set<string>();
  const jobs: NormalizedJob[] = [];

  for (const html of responses) {
    for (const job of extractJobs(html)) {
      if (!job.identifier || seen.has(job.identifier)) continue;
      seen.add(job.identifier);

      const skills = job.skills ?? [];
      const location = job.jobLocation?.address?.addressLocality;
      const haystack = `${job.title} ${job.occupationalCategory ?? ""} ${skills.join(" ")} ${location ?? ""}`;
      const tags = [...skills];
      if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

      jobs.push({
        externalId: job.identifier,
        title: job.title,
        company: job.hiringOrganization?.name ?? "Desconhecida",
        location,
        remoteType: detectRemoteType(haystack),
        tags,
        isInternship: INTERNSHIP_KEYWORDS.some((kw) => job.title.toLowerCase().includes(kw)),
        url: job.url,
        publishedAt: job.datePosted ? new Date(job.datePosted) : undefined,
      });
    }
  }

  return jobs;
};

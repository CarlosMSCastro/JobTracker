import { detectRemoteType, hasAiSignal } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

const FEEDS = ["informatica", "internet"];
const INTERNSHIP_KEYWORDS = ["estágio", "estagiário", "estagiária", "trainee"];

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

type ParsedItem = { title: string; link: string; pubDate?: string; company?: string; location?: string };

function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const blocks = xml.split("<item>").slice(1);

  for (const block of blocks) {
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "");
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    const description = decodeEntities(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");

    if (!title || !link) continue;

    // formato: "Empresa | Localização | resto da descrição..."
    const [company, location] = description.split("|").map((s) => s.trim());
    items.push({ title, link, pubDate, company, location });
  }

  return items;
}

export const fetchExpressoEmprego: Fetcher = async () => {
  const responses = await Promise.all(
    FEEDS.map((feed) =>
      fetch(`https://expressoemprego.pt/rss/${feed}`).then((res) => (res.ok ? res.text() : "")),
    ),
  );

  const seen = new Set<string>();
  const jobs: NormalizedJob[] = [];

  for (const xml of responses) {
    for (const item of parseFeed(xml)) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);

      const haystack = `${item.title} ${item.location ?? ""}`;
      const tags: string[] = [];
      if (hasAiSignal(haystack)) tags.push("AI");

      jobs.push({
        title: item.title,
        company: item.company || "Desconhecida",
        location: item.location,
        remoteType: detectRemoteType(haystack),
        tags,
        isInternship: INTERNSHIP_KEYWORDS.some((kw) => item.title.toLowerCase().includes(kw)),
        url: item.link,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
    }
  }

  return jobs;
};

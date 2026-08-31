import { hasAiSignal, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

// Categorias reais do WeWorkRemotely (weworkremotely.com/categories/{slug}.rss).
// "remote-programming-jobs" já é a categoria-mãe de back-end/front-end/full-stack.
// Nota: estas categorias NÃO filtram de forma fiável — empresas grandes (Stripe, Coinbase) aparecem
// com toda a lista de vagas em todas as categorias, provavelmente por destaque pago. Por isso o
// filtro de relevância corre sempre sobre o título, independentemente da categoria da fonte.
const CATEGORIES = ["remote-programming-jobs", "remote-devops-sysadmin-jobs", "remote-customer-support-jobs"];

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

type ParsedItem = { title: string; link: string; pubDate?: string; category?: string };

function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const blocks = xml.split("<item>").slice(1);

  for (const block of blocks) {
    const title = decodeEntities(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "");
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    const category = decodeEntities(block.match(/<category>([\s\S]*?)<\/category>/)?.[1]?.trim() ?? "");

    if (!title || !link) continue;
    items.push({ title, link, pubDate, category });
  }

  return items;
}

export const fetchWeWorkRemotely: Fetcher = async () => {
  const responses = await Promise.all(
    CATEGORIES.map((category) =>
      fetch(`https://weworkremotely.com/categories/${category}.rss`).then((res) =>
        res.ok ? res.text() : "",
      ),
    ),
  );

  const seen = new Set<string>();
  const jobs: NormalizedJob[] = [];

  for (const xml of responses) {
    for (const item of parseFeed(xml)) {
      if (seen.has(item.link)) continue;

      const colonIndex = item.title.indexOf(":");
      const company = colonIndex > -1 ? item.title.slice(0, colonIndex).trim() : "Desconhecida";
      const position = colonIndex > -1 ? item.title.slice(colonIndex + 1).trim() : item.title;

      if (!isItRelevant(position)) continue;
      seen.add(item.link);

      const haystack = `${position} ${item.category ?? ""}`;
      const tags: string[] = [];
      if (hasAiSignal(haystack)) tags.push("AI");

      jobs.push({
        title: position,
        company,
        remoteType: "REMOTO",
        tags,
        url: item.link,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      });
    }
  }

  return jobs;
};

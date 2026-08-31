import { detectRemoteType, hasAiSignal, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

// Categorias do Empregos.org (ids do formulário de pesquisa avançada, campo "jids[]") — em teoria
// já são de informática/TI, mas a categorização do site tem lixo misturado (ex: "Responsável
// Armazém e Inventário" apareceu na categoria Informática), por isso ainda passa por
// isItRelevant() no título como rede de segurança, tal como as categorias "keyword" do Net-Empregos.
const CATEGORY_IDS = [35, 66]; // Informática, Tecnologias de Informação

const BASE_URL = "https://empregos.org";
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

const PAGE_SIZE_PARAM = "3"; // o_show=3 -> 25 resultados por página
const MAX_PAGES = 4; // "poucas páginas" — pedido explícito do utilizador
const POSTED_WITHIN_DAYS = "14"; // janela de recência do próprio site (parâmetro "posted")

const INTERNSHIP_KEYWORDS = ["estágio", "estagiário", "estagiária", "trainee"];

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parsePostedDate(text: string): Date | undefined {
  // formato "Aug 13" (inglês, sem ano — o site usa abreviações de mês em inglês apesar da UI em PT)
  const match = text.match(/([A-Za-z]{3})\s+(\d{1,2})/);
  if (!match) return undefined;
  const month = MONTHS[match[1].toLowerCase()];
  if (month === undefined) return undefined;

  const day = Number(match[2]);
  const now = new Date();
  let year = now.getFullYear();
  let date = new Date(year, month, day);
  if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    year -= 1;
    date = new Date(year, month, day);
  }
  return date;
}

type ScrapedItem = {
  jobId: string;
  title: string;
  company: string;
  location?: string;
  posted?: string;
};

function parseListingPage(html: string): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const chunks = html.split('<div class="rownumber">').slice(1);

  for (const chunk of chunks) {
    const titleMatch = chunk.match(/<h2><a href="[^"]*job_id=(\d+)[^"]*"[^>]*title="([^"]+)"/);
    if (!titleMatch) continue;

    const companyMatch = chunk.match(/company_id=\d+[^"]*"[^>]*title="([^"]+)" class="hilink">([\s\S]*?)<\/a>\s*-\s*([^<]*)<br/);
    const postedMatch = chunk.match(/class="posted">Publicado:\s*([A-Za-z]{3}\s+\d{1,2})/);

    items.push({
      jobId: titleMatch[1],
      title: decodeEntities(titleMatch[2]).trim(),
      company: companyMatch ? decodeEntities(companyMatch[1]).trim() : "Desconhecida",
      location: companyMatch ? decodeEntities(companyMatch[3]).trim() : undefined,
      posted: postedMatch?.[1],
    });
  }

  return items;
}

async function fetchPage(page: number): Promise<ScrapedItem[]> {
  const params = new URLSearchParams();
  for (const cid of CATEGORY_IDS) params.append("jids[]", String(cid));
  params.set("o", "1"); // ordenar por data de publicação
  params.set("o_show", PAGE_SIZE_PARAM);
  params.set("posted", POSTED_WITHIN_DAYS);
  params.set("f", String(page * 25));

  const res = await fetch(`${BASE_URL}/jobfind.php?${params.toString()}`, { headers: HEADERS });
  if (!res.ok) return [];
  return parseListingPage(await res.text());
}

export const fetchEmpregosOrg: Fetcher = async () => {
  const jobs: NormalizedJob[] = [];
  const seenIds = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const items = await fetchPage(page);
    if (items.length === 0) break;

    for (const item of items) {
      if (seenIds.has(item.jobId)) continue;
      if (!isItRelevant(item.title)) continue;
      seenIds.add(item.jobId);

      const haystack = `${item.title} ${item.location ?? ""}`;
      const tags: string[] = [];
      if (hasAiSignal(haystack)) tags.push("AI");

      jobs.push({
        externalId: item.jobId,
        title: item.title,
        company: item.company,
        location: item.location,
        remoteType: detectRemoteType(haystack),
        tags,
        isInternship: INTERNSHIP_KEYWORDS.some((kw) => item.title.toLowerCase().includes(kw)),
        url: `${BASE_URL}/view.php?job_id=${item.jobId}`,
        publishedAt: item.posted ? parsePostedDate(item.posted) : undefined,
      });
    }

    if (items.length < 25) break; // última página
  }

  return jobs;
};

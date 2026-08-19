import { classifyArea, detectRemoteType, hasAiSignal, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

// Categorias do Net-Empregos (ver select "categoria" no formulário de pesquisa do site).
// As "Informática (...)" já são inequivocamente relevantes; as outras são generalistas e cada
// vaga é validada pelo título antes de entrar (para não trazer toda a loja de roupa ou call center
// de seguros junto).
const ALWAYS_RELEVANT_CATEGORY_IDS = [5, 34, 35, 36, 37, 38, 49]; // Informática (Programação/Formação/Internet/Multimedia/Redes/Sistemas/Hardware)
const KEYWORD_GATED_CATEGORY_IDS = [57, 30, 52]; // Call Center / Help Desk, Lojas / Comércio / Balcão, Serviços Técnicos

const PAGES_PER_CATEGORY = 2; // ~18 vagas por página — 2 páginas dá boa cobertura sem exagerar em pedidos
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const BASE_URL = "https://www.net-empregos.com";

const INTERNSHIP_KEYWORDS = ["estágio", "estagiário", "estagiária", "trainee"];

function parsePtDate(text: string): Date | undefined {
  // formato "19-8-2026"
  const match = text.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

type ScrapedItem = {
  title: string;
  href: string;
  date?: string;
  location?: string;
  company?: string;
};

function parseListingPage(html: string): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const chunks = html.split('<div class="job-item media">').slice(1);

  for (const chunk of chunks) {
    const titleMatch = chunk.match(/class="oferta-link"[^>]*href=(\/\d+\/[^>]+?)>([^<]+)<\/a>/);
    if (!titleMatch) continue;

    const dateMatch = chunk.match(/flaticon-calendar"[^>]*><\/i>\s*([^<]+)</);
    const locationMatch = chunk.match(/flaticon-pin"[^>]*><\/i>\s*([^<]+)</);
    const companyMatch = chunk.match(/flaticon-work"[^>]*><\/i>\s*([^<]+)</);

    items.push({
      title: titleMatch[2].trim(),
      href: titleMatch[1],
      date: dateMatch?.[1]?.trim(),
      location: locationMatch?.[1]?.trim(),
      company: companyMatch?.[1]?.trim(),
    });
  }

  return items;
}

async function fetchCategoryPage(categoryId: number, page: number): Promise<ScrapedItem[]> {
  const url = `${BASE_URL}/pesquisa-empregos.asp?categoria=${categoryId}&page=${page}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return [];
  const buffer = await res.arrayBuffer();
  const html = new TextDecoder("iso-8859-1").decode(buffer);
  return parseListingPage(html);
}

export const fetchNetEmpregos: Fetcher = async () => {
  const jobs: NormalizedJob[] = [];
  const seenHrefs = new Set<string>();

  const requests: Promise<{ items: ScrapedItem[]; keywordGated: boolean }>[] = [];

  for (const categoryId of ALWAYS_RELEVANT_CATEGORY_IDS) {
    for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
      requests.push(fetchCategoryPage(categoryId, page).then((items) => ({ items, keywordGated: false })));
    }
  }
  for (const categoryId of KEYWORD_GATED_CATEGORY_IDS) {
    for (let page = 1; page <= PAGES_PER_CATEGORY; page++) {
      requests.push(fetchCategoryPage(categoryId, page).then((items) => ({ items, keywordGated: true })));
    }
  }

  const results = await Promise.all(requests);

  for (const { items, keywordGated } of results) {
    for (const item of items) {
      if (seenHrefs.has(item.href)) continue;
      if (keywordGated && !isItRelevant(item.title)) continue;
      seenHrefs.add(item.href);

      const haystack = `${item.title} ${item.location ?? ""}`;
      const tags: string[] = [];
      if (hasAiSignal(haystack)) tags.push("AI");

      jobs.push({
        title: item.title,
        company: item.company || "Desconhecida",
        location: item.location,
        remoteType: detectRemoteType(haystack),
        country: "Portugal",
        area: classifyArea(haystack),
        tags,
        isInternship: INTERNSHIP_KEYWORDS.some((kw) => item.title.toLowerCase().includes(kw)),
        url: `${BASE_URL}${item.href}`,
        publishedAt: item.date ? parsePtDate(item.date) : undefined,
      });
    }
  }

  return jobs;
};

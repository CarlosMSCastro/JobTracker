import { classifyArea, detectRemoteType, hasAiSignal, isItRelevant, isSalesLike } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

// Categorias do Net-Empregos (ver select "categoria" no formulário de pesquisa do site, mapeado
// via probing de pesquisa-empregos.asp?categoria=N e leitura do <title> de cada página).
// Modo por categoria:
// - "none": informática — inequivocamente relevante, entra tudo.
// - "sales": call center/help desk e administração/secretariado — a categoria já é relevante pelo
//   nome (não faz sentido pedir "suporte/helpdesk" no título quando a categoria já É isso — mesma
//   armadilha identificada antes), mas ainda tem vagas puramente comerciais lá dentro para excluir.
// - "keyword": categorias generalistas (lojas, serviços técnicos) — cada vaga é validada pelo
//   título antes de entrar, para não trazer toda a loja de roupa ou seguros junto.
const CATEGORY_FILTER: Record<number, "none" | "sales" | "keyword"> = {
  5: "none",
  34: "none",
  35: "none",
  36: "none",
  37: "none",
  38: "none",
  49: "none",
  57: "sales", // Call Center / Help Desk
  29: "sales", // Administração / Secretariado
  30: "keyword", // Lojas / Comércio / Balcão
  52: "keyword", // Serviços Técnicos
};

const DEFAULT_PAGES_PER_CATEGORY = 2; // ~18 vagas por página — 2 páginas dá boa cobertura sem exagerar em pedidos
// Call Center/Help Desk (1092 vagas) e Administração/Secretariado (1698 vagas) têm um volume muito
// maior que as restantes categorias — pedido explícito do utilizador para trazer mais destas.
const PAGES_OVERRIDE: Record<number, number> = { 57: 5, 29: 5 };

function pagesForCategory(categoryId: number): number {
  return PAGES_OVERRIDE[categoryId] ?? DEFAULT_PAGES_PER_CATEGORY;
}
const BASE_URL = "https://www.net-empregos.com";

// Conjunto mais completo de headers (não só User-Agent) — pedidos vindos do IP da Vercel estavam a
// devolver 0 resultados em produção enquanto localmente funcionavam sempre, o que sugere alguma
// heurística anti-bot a barrar pedidos "demasiado nus". Referer + Accept*/sec-fetch-* imitam melhor
// um pedido real de browser a navegar dentro do próprio site.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
  Referer: `${BASE_URL}/`,
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
};

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

  const requests: Promise<{ items: ScrapedItem[]; filter: "none" | "sales" | "keyword" }>[] = [];

  for (const [categoryIdStr, filter] of Object.entries(CATEGORY_FILTER)) {
    const categoryId = Number(categoryIdStr);
    for (let page = 1; page <= pagesForCategory(categoryId); page++) {
      requests.push(fetchCategoryPage(categoryId, page).then((items) => ({ items, filter })));
    }
  }

  const results = await Promise.all(requests);

  for (const { items, filter } of results) {
    for (const item of items) {
      if (seenHrefs.has(item.href)) continue;
      if (filter === "keyword" && !isItRelevant(item.title)) continue;
      if (filter === "sales" && isSalesLike(item.title)) continue;
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

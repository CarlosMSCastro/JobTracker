import Firecrawl from "firecrawl";
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

// Via Firecrawl em vez de fetch direto: o net-empregos.com bloqueia pedidos vindos de IPs de
// datacenter (inclui a Vercel) independentemente dos headers enviados — o Firecrawl faz o pedido
// a partir da infraestrutura dele, contornando esse bloqueio.
const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

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
    // O Firecrawl serializa o DOM (não os bytes originais do site): href vem sempre entre aspas e
    // absolutizado (https://www.net-empregos.com/123/...) em vez do relativo sem aspas do HTML
    // original (href=/123/...) — a captura ignora tudo antes do "/123/" para aceitar os dois casos.
    const titleMatch = chunk.match(/class="oferta-link"[^>]*href="?[^">]*?(\/\d+\/[^">]+)"?[^>]*>([^<]+)<\/a>/);
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

function categoryPageUrl(categoryId: number, page: number): string {
  return `${BASE_URL}/pesquisa-empregos.asp?categoria=${categoryId}&page=${page}`;
}

export const fetchNetEmpregos: Fetcher = async () => {
  const jobs: NormalizedJob[] = [];
  const seenHrefs = new Set<string>();

  // Um scrape por URL individual (Promise.all) excedia logo o rate limit do plano Firecrawl
  // (10 pedidos/min) com as 28 páginas deste refresh. batchScrape entrega a lista toda numa só
  // chamada e o Firecrawl trata do ritmo internamente.
  const requestUrls: { url: string; filter: "none" | "sales" | "keyword" }[] = [];
  for (const [categoryIdStr, filter] of Object.entries(CATEGORY_FILTER)) {
    const categoryId = Number(categoryIdStr);
    for (let page = 1; page <= pagesForCategory(categoryId); page++) {
      requestUrls.push({ url: categoryPageUrl(categoryId, page), filter });
    }
  }
  const filterByUrl = new Map(requestUrls.map(({ url, filter }) => [url, filter]));

  const job = await firecrawl.batchScrape(
    requestUrls.map((r) => r.url),
    { options: { formats: ["rawHtml"] }, pollInterval: 2, timeout: 50 },
  );

  const results: { items: ScrapedItem[]; filter: "none" | "sales" | "keyword" }[] = [];
  for (const doc of job.data) {
    const sourceUrl = doc.metadata?.sourceURL ?? doc.metadata?.url;
    const filter = sourceUrl ? filterByUrl.get(sourceUrl) : undefined;
    if (!filter || !doc.rawHtml) continue;
    results.push({ items: parseListingPage(doc.rawHtml), filter });
  }

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

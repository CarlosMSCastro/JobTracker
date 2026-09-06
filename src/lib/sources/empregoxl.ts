import { detectRemoteType, hasAiSignal, isEventsRelevant, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

// Categorias do Emprego XL relevantes ao perfil de Carlos — a categorização do próprio site tem
// lixo misturado (ex: "vendedor de automóveis" apareceu no feed de "informatica"), por isso todos
// os itens ainda passam por isItRelevant() como rede de segurança, tal como o Empregos.org.
const FEEDS = ["informatica", "call-center-help-desk", "administracao-secretariado"];
// Perfil da Karol: hotelaria/turismo, publicidade/marketing, relações públicas, mais
// administração/secretariado reutilizada.
const KAROL_FEEDS = ["hotelaria-turismo", "publicidade-marketing", "relacoes-publicas", "administracao-secretariado"];
const BASE_URL = "https://www.empregoxl.com";
const INTERNSHIP_KEYWORDS = ["estágio", "estagiário", "estagiária", "trainee"];

// O feed é RSS 1.0/RDF (não RSS 2.0): cada vaga é um <item rdf:about="URL"> à parte do <channel>,
// não aninhado dentro dele.
type ParsedItem = { title: string; link: string; description: string; date?: string };

const NAMED_ENTITIES: Record<string, string> = {
  ccedil: "ç",
  Ccedil: "Ç",
  atilde: "ã",
  Atilde: "Ã",
  otilde: "õ",
  Otilde: "Õ",
  aacute: "á",
  Aacute: "Á",
  eacute: "é",
  Eacute: "É",
  iacute: "í",
  Iacute: "Í",
  oacute: "ó",
  Oacute: "Ó",
  uacute: "ú",
  Uacute: "Ú",
  acirc: "â",
  Acirc: "Â",
  ecirc: "ê",
  Ecirc: "Ê",
  ocirc: "ô",
  Ocirc: "Ô",
  agrave: "à",
  Agrave: "À",
  uuml: "ü",
  ntilde: "ñ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

// O feed escapa a descrição duas vezes (é HTML dentro de XML): "&ccedil;" no HTML original chega
// como "&amp;ccedil;" no XML. Um primeiro passe desfaz o escape estrutural do XML; um segundo passe
// resolve as entidades nomeadas (acentuação) e numéricas que sobram.
function decodeEntities(text: string): string {
  let out = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  out = out.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
  out = out.replace(/&([A-Za-z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
  return out;
}

function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const blocks = xml.split(/<item rdf:about="[^"]*">/).slice(1);

  for (const block of blocks) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
    const description = block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
    const date = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1]?.trim();

    if (!title || !link) continue;
    items.push({ title: decodeEntities(title), link, description: decodeEntities(description), date });
  }

  return items;
}

function parseLocation(description: string): string | undefined {
  const match = description.match(/Localiza[çc][ãa]o:\s*<\/strong>\s*([^<]+)</i);
  return match?.[1]?.trim() || undefined;
}

function parsePublishedAt(date?: string): Date | undefined {
  if (!date) return undefined;
  // formato "2026-09-04 15:10:11" — falta o "T" para ser interpretado de forma fiável como data válida
  const parsed = new Date(date.includes("T") ? date : date.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export const fetchEmpregoXl: Fetcher = async (config) => {
  const jobs: NormalizedJob[] = [];
  const seenLinks = new Set<string>();
  const isKarol = config.profile === "KAROL";
  const feeds = isKarol ? KAROL_FEEDS : FEEDS;
  const isRelevant = isKarol ? isEventsRelevant : isItRelevant;

  const responses = await Promise.all(
    feeds.map((feed) =>
      fetch(`${BASE_URL}/rss/${feed}/`, { headers: { "User-Agent": "Mozilla/5.0" } }).then((res) =>
        res.ok ? res.text() : "",
      ),
    ),
  );

  for (const xml of responses) {
    for (const item of parseFeed(xml)) {
      if (seenLinks.has(item.link)) continue;
      if (!isRelevant(item.title)) continue;
      seenLinks.add(item.link);

      const location = parseLocation(item.description);
      const haystack = `${item.title} ${location ?? ""}`;
      const tags: string[] = [];
      if (hasAiSignal(haystack)) tags.push("AI");

      jobs.push({
        title: item.title,
        company: "Desconhecida", // o feed não estrutura o nome da empresa em campo próprio
        location,
        remoteType: detectRemoteType(haystack),
        tags,
        isInternship: INTERNSHIP_KEYWORDS.some((kw) => item.title.toLowerCase().includes(kw)),
        url: item.link,
        publishedAt: parsePublishedAt(item.date),
      });
    }
  }

  return jobs;
};

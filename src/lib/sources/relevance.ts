// Palavras-chave para reconhecer vagas de informática/TI em fontes generalistas (ex: Arbeitnow,
// Net-Empregos), que agregam todo o tipo de emprego e não só tech. Usadas em title+tags+descrição.
const IT_KEYWORDS = [
  "developer",
  "programmer",
  "programador",
  "desenvolvedor",
  "engineer",
  "engenheiro de software",
  "software",
  "backend",
  "frontend",
  "full stack",
  "fullstack",
  "devops",
  "sysadmin",
  "system administrator",
  "administrador de sistemas",
  "network",
  "redes informáticas",
  "cybersecurity",
  "segurança informática",
  "security engineer",
  "information security",
  "database",
  "sql",
  "cloud",
  "aws",
  "azure",
  "kubernetes",
  "docker",
  "linux",
  "windows server",
  "active directory",
  "qa engineer",
  "quality assurance",
  "tester",
  "data engineer",
  "data scientist",
  "data analyst",
  "machine learning",
  "artificial intelligence",
  "javascript",
  "typescript",
  "python",
  "java",
  "react",
  "node",
  "php",
  ".net",
  "web developer",
  "mobile developer",
  "ios developer",
  "android developer",
  "scrum",
  "product owner",
  "ui/ux",
  "web design",
];

// Suporte/apoio técnico — pedido explícito do utilizador: incluir estas vagas, exceto quando são
// claramente de vendas (ver SALES_KEYWORDS).
const SUPPORT_KEYWORDS = [
  "support",
  "suporte",
  "helpdesk",
  "help desk",
  "service desk",
  "apoio ao cliente",
  "apoio técnico",
  "assistência técnica",
  "técnico informático",
  "técnico de informática",
  "técnico de hardware",
  "call center",
  "1st line",
  "2nd line",
  "tier 1",
  "tier 2",
  "desktop support",
];

// Lojas/retalho de informática — outro pedido explícito.
const RETAIL_KEYWORDS = [
  "loja de informática",
  "loja informática",
  "computer store",
  "electronics store",
  "reparação de computadores",
  "reparação de telemóveis",
  "assistência técnica informática",
  "pc repair",
];

// Presença de qualquer um destes junto a "support"/"suporte" indica que é vendas disfarçada de
// apoio ao cliente — excluir mesmo estando na categoria de suporte.
const SALES_KEYWORDS = [
  "sales",
  "vendas",
  "vendedor",
  "comercial",
  "account executive",
  "business development",
  "sales representative",
];

export const AI_KEYWORDS = ["ai", "machine learning", "inteligência artificial", "llm", "generative ai", "ml engineer"];

const REMOTE_KEYWORDS = ["remoto", "remote", "teletrabalho", "work from home", "100% remote", "totalmente remoto"];
const HYBRID_KEYWORDS = ["híbrido", "hibrido", "hybrid"];

function matchesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

export function isItRelevant(text: string): boolean {
  const haystack = text.toLowerCase();

  if (matchesAny(haystack, IT_KEYWORDS)) return true;
  if (matchesAny(haystack, RETAIL_KEYWORDS)) return true;
  if (matchesAny(haystack, SUPPORT_KEYWORDS) && !matchesAny(haystack, SALES_KEYWORDS)) return true;

  return false;
}

export function hasAiSignal(text: string): boolean {
  const haystack = text.toLowerCase();
  return AI_KEYWORDS.some((kw) => haystack.includes(kw));
}

// Classifica a área para os filtros da app: "Dev/TI" para perfis de programação/engenharia,
// "Helpdesk" para suporte/apoio técnico/loja.
export function classifyArea(text: string): "Dev/TI" | "Helpdesk" {
  const haystack = text.toLowerCase();
  const isDev = matchesAny(haystack, IT_KEYWORDS);
  const isSupportOrRetail = matchesAny(haystack, SUPPORT_KEYWORDS) || matchesAny(haystack, RETAIL_KEYWORDS);

  if (isSupportOrRetail && !isDev) return "Helpdesk";
  return "Dev/TI";
}

// Deteta modalidade a partir de texto livre (título + localização) quando a fonte não dá um campo
// estruturado para isto — usado por ITJobs.pt, Jooble e Net-Empregos.
export function detectRemoteType(text: string): "REMOTO" | "HIBRIDO" | undefined {
  const haystack = text.toLowerCase();
  if (matchesAny(haystack, REMOTE_KEYWORDS)) return "REMOTO";
  if (matchesAny(haystack, HYBRID_KEYWORDS)) return "HIBRIDO";
  return undefined;
}

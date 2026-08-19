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
  "call-center",
  "contact center",
  "contact centre",
  "1st line",
  "2nd line",
  "tier 1",
  "tier 2",
  "desktop support",
  "atendimento ao cliente",
  "atendimento a clientes",
  "customer service",
  "customer support",
  "customer care",
  "teleoperador",
  "teleoperadora",
  "operador de call center",
  "operador de contact center",
];

// Administrativo/secretariado — pedido explícito do utilizador.
const ADMIN_KEYWORDS = [
  "administrativo",
  "administrativa",
  "secretariado",
  "secretária",
  "secretario",
  "secretário",
  "rececionista",
  "receção",
  "office manager",
  "assistente de direção",
  "front desk",
  "assistente pessoal",
];

// Backoffice — tratado à parte de "administrativo" porque em Portugal é um termo próprio,
// muito usado em banca/seguros/BPO ("Técnico de Backoffice").
const BACKOFFICE_KEYWORDS = ["backoffice", "back office", "back-office"];

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

// Vagas "Senior" — pedido explícito do utilizador para excluir sempre, independente da área/fonte.
// Cobre PT e EN, incluindo a abreviatura "sr." (com ponto, para não apanhar "sra"/"srta").
const SENIOR_KEYWORDS = ["senior", "sénior", "sr."];

export const AI_KEYWORDS = ["ai", "machine learning", "inteligência artificial", "llm", "generative ai", "ml engineer"];

const REMOTE_KEYWORDS = ["remoto", "remote", "teletrabalho", "work from home", "100% remote", "totalmente remoto"];
const HYBRID_KEYWORDS = ["híbrido", "hibrido", "hybrid"];

// Cidades/regiões de Portugal — usado para filtrar vagas presenciais/híbridas de fontes
// internacionais (ex: Arbeitnow) que não indicam país e trazem sobretudo vagas na Alemanha/Reino
// Unido. Vagas remotas não passam por este filtro (remoto não exige estar em Portugal).
const PORTUGAL_LOCATION_KEYWORDS = [
  "portugal",
  "lisboa",
  "lisbon",
  "porto",
  "braga",
  "coimbra",
  "faro",
  "aveiro",
  "setúbal",
  "setubal",
  "cascais",
  "oeiras",
  "matosinhos",
  "guimarães",
  "guimaraes",
  "leiria",
  "évora",
  "evora",
  "viseu",
  "algarve",
  "madeira",
  "açores",
  "acores",
  "vila nova de gaia",
  "amadora",
  "sintra",
  "almada",
];

function matchesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

export function isItRelevant(text: string): boolean {
  const haystack = text.toLowerCase();

  if (matchesAny(haystack, IT_KEYWORDS)) return true;
  if (matchesAny(haystack, RETAIL_KEYWORDS)) return true;
  if (matchesAny(haystack, BACKOFFICE_KEYWORDS)) return true;

  const isSupportOrAdmin = matchesAny(haystack, SUPPORT_KEYWORDS) || matchesAny(haystack, ADMIN_KEYWORDS);
  if (isSupportOrAdmin && !matchesAny(haystack, SALES_KEYWORDS)) return true;

  return false;
}

// Vendas disfarçadas de suporte/administrativo (ex: "Call Center — Comercial de Seguros"). Usado
// para limpar categorias já assumidas como relevantes (ex: Call Center/Help Desk, Administração no
// Net-Empregos) que, apesar do nome, também misturam vagas puramente comerciais.
export function isSalesLike(text: string): boolean {
  return matchesAny(text.toLowerCase(), SALES_KEYWORDS);
}

export function isSeniorTitle(text: string): boolean {
  return matchesAny(text.toLowerCase(), SENIOR_KEYWORDS);
}

export function isPortugalLocation(text: string): boolean {
  return matchesAny(text.toLowerCase(), PORTUGAL_LOCATION_KEYWORDS);
}

// Concelhos da Área Metropolitana do Porto + Cávado + Ave — a zona de Porto/Braga/Guimarães e
// concelhos associados, pedido explícito do utilizador para filtrar vagas presenciais/híbridas.
export const NORTE_REGION_KEYWORDS = [
  // Área Metropolitana do Porto
  "porto",
  "vila nova de gaia",
  "matosinhos",
  "gondomar",
  "maia",
  "valongo",
  "póvoa de varzim",
  "povoa de varzim",
  "vila do conde",
  "santo tirso",
  "trofa",
  "santa maria da feira",
  "são joão da madeira",
  "sao joao da madeira",
  "oliveira de azeméis",
  "oliveira de azemeis",
  "vale de cambra",
  "arouca",
  "espinho",
  // Cávado (Braga)
  "braga",
  "barcelos",
  "esposende",
  "amares",
  "vila verde",
  "terras de bouro",
  // Ave (Guimarães)
  "guimarães",
  "guimaraes",
  "vila nova de famalicão",
  "vila nova de famalicao",
  "famalicão",
  "famalicao",
  "fafe",
  "vizela",
  "póvoa de lanhoso",
  "povoa de lanhoso",
  "vieira do minho",
  "cabeceiras de basto",
];

export function isNorteRegion(text: string): boolean {
  return matchesAny(text.toLowerCase(), NORTE_REGION_KEYWORDS);
}

export function hasAiSignal(text: string): boolean {
  const haystack = text.toLowerCase();
  return AI_KEYWORDS.some((kw) => haystack.includes(kw));
}

// Classifica a área para os filtros da app: "Dev/TI" para perfis de programação/engenharia,
// "Helpdesk" para suporte/apoio técnico/loja, "Backoffice" para funções de backoffice, "Admin"
// para administrativo/secretariado/receção. Prioridade: Dev/TI > Helpdesk > Backoffice > Admin,
// porque um título pode conter mais que uma palavra-chave (ex: "Técnico de Suporte Administrativo").
export function classifyArea(text: string): "Dev/TI" | "Helpdesk" | "Backoffice" | "Admin" {
  const haystack = text.toLowerCase();
  const isDev = matchesAny(haystack, IT_KEYWORDS);
  const isSupportOrRetail = matchesAny(haystack, SUPPORT_KEYWORDS) || matchesAny(haystack, RETAIL_KEYWORDS);
  const isBackoffice = matchesAny(haystack, BACKOFFICE_KEYWORDS);
  const isAdmin = matchesAny(haystack, ADMIN_KEYWORDS);

  if (isDev) return "Dev/TI";
  if (isSupportOrRetail) return "Helpdesk";
  if (isBackoffice) return "Backoffice";
  if (isAdmin) return "Admin";
  return "Dev/TI";
}

// Deteta modalidade a partir de texto livre (título + localização) quando a fonte não dá um campo
// estruturado para isto — usado por ITJobs.pt, Jooble, Net-Empregos, Expresso Emprego e Arbeitnow.
// Por omissão assume "PRESENCIAL": nestas fontes (ofertas generalistas em Portugal) a esmagadora
// maioria das vagas é no local e só menciona "remoto"/"híbrido" quando não é esse o caso — sem este
// valor por omissão, o filtro "Presencial" nunca apanhava nada (nenhuma vaga tinha o campo definido).
export function detectRemoteType(text: string): "REMOTO" | "HIBRIDO" | "PRESENCIAL" {
  const haystack = text.toLowerCase();
  if (matchesAny(haystack, REMOTE_KEYWORDS)) return "REMOTO";
  if (matchesAny(haystack, HYBRID_KEYWORDS)) return "HIBRIDO";
  return "PRESENCIAL";
}

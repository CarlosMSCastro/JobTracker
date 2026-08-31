import { franc } from "franc-min";

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
// Cobre PT e EN, incluindo a abreviatura "sr." (com ponto, para não apanhar "sra"/"srta"). Não inclui
// "manager" sozinho porque colide com "office manager", já aceite em ADMIN_KEYWORDS.
const SENIOR_KEYWORDS = ["senior", "sénior", "sr.", "principal", "staff", "director", "diretor", "diretora", "lead"];

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

// Vagas do mercado alemão/DACH (Alemanha/Áustria/Suíça) que aparecem sobretudo no Arbeitnow —
// o filtro de país (isPortugalLocation) só se aplica a vagas presenciais/híbridas, remoto passa
// sempre sem verificação, o que deixava passar vagas claramente não relevantes (ex: "IT Systems
// Engineer (m/w/d)" em Munique) só por estarem marcadas como remoto. "(m/w/d)"/"(w/m/d)"/"(m/f/d)"
// é a convenção de inclusão de género usada quase em exclusivo em anúncios de emprego alemães —
// sinal forte e com baixo risco de falso positivo (nunca aparece em vagas PT/EN normais).
const GERMAN_GENDER_TAG_RE = /\((?:m\/w\/d|w\/m\/d|d\/w\/m|m\/f\/d|f\/m\/d)\)|all genders/i;
const GERMAN_WORDS = ["mitarbeiter", "sucht:", " für ", "gehalt", "bewerbung"];
const GERMAN_LANGUAGE_REQUIRED_KEYWORDS = [
  "german speaking",
  "fluent in german",
  "deutschkenntnisse",
  "muttersprache deutsch",
];

export function isGermanMarketJob(text: string): boolean {
  if (GERMAN_GENDER_TAG_RE.test(text)) return true;
  const haystack = text.toLowerCase();
  return matchesAny(haystack, GERMAN_WORDS) || matchesAny(haystack, GERMAN_LANGUAGE_REQUIRED_KEYWORDS);
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

// Sinais desqualificantes que só aparecem no texto completo da página de destino, não no
// título/snippet curto que as fontes já trazem — padrões recolhidos das notas manuais do
// utilizador em vagas que já tinha descartado (ver memória "project_auto_discard_feature").
// Usado por src/lib/sources/autodiscard.ts depois de ir buscar a página.
// Cobre as duas ordens comuns ("6 years of experience...", "professional experience (3+ years)...")
// com um intervalo limitado (sem cruzar frases, por isso corta em ".") para apanhar palavras pelo
// meio ("years of hands-on experience") sem colar números e "experiência" que não têm nada a ver.
const YEARS_THEN_EXPERIENCE_RE = /(\d+)\+?\s*(anos|years?)[^.]{0,40}?(experi[êe]ncia|experience)/i;
const EXPERIENCE_THEN_YEARS_RE = /(experi[êe]ncia|experience)[^.]{0,40}?(\d+)\+?\s*(anos|years?)/i;
const MIN_YEARS_TO_EXCLUDE = 3;

const US_ONLY_KEYWORDS = ["usa only", "us only", "usa based only", "us based only", "united states only"];

// Deteção de idioma no texto completo da página (não no título — em textos curtos o franc erra
// facilmente, ex: confundiu "Programador de Software Júnior" isolado com romeno). Português,
// inglês e espanhol passam; qualquer outro idioma detetado com confiança é motivo de exclusão —
// pedido explícito do utilizador depois de aparecerem vagas em francês e alemão por sítios como o
// Net-Empregos que, ao contrário do Arbeitnow, não têm um sinal estruturado de mercado/país.
const ALLOWED_LANGUAGES: Record<string, string> = { por: "português", eng: "inglês", spa: "espanhol" };
const LANGUAGE_NAMES: Record<string, string> = {
  fra: "francês",
  deu: "alemão",
  ita: "italiano",
  nld: "neerlandês",
  pol: "polaco",
  rus: "russo",
  ukr: "ucraniano",
  ron: "romeno",
};

function detectForeignLanguage(text: string): string | null {
  const code = franc(text, { minLength: 40 });
  if (code === "und" || code in ALLOWED_LANGUAGES) return null;
  return LANGUAGE_NAMES[code] ?? code;
}

// O Jobicy (e plataformas com o mesmo template de "Role snapshot") indica a elegibilidade geográfica
// como "Remote from <país/região> Salary ...", em vez de frases como "USA only" já cobertas acima —
// só descoberto ao investigar por que o auto-discard quase nunca disparava nas fontes remotas
// internacionais (Jobicy tinha 416 vagas e só 4 exclusões antes disto — ver memória
// "project_job_tracker_flow_redesign"). Qualquer coisa que não seja claramente aberta a Portugal
// (mundial/Europa/etc) é tratada como restrição geográfica. \b em cada termo evita falsos positivos
// como "Peru" a bater com "eu", ou "Germany" a bater com "any".
const REMOTE_FROM_RE = /remote from ([a-zà-ÿ\s,()&/-]{2,60}?)\s+salary/i;
const INCLUSIVE_REMOTE_RE = /\b(anywhere|worldwide|world|global|international|portugal|europe|european|emea|earth|eu|any)\b/i;

function extractYearsRequirement(text: string): number | null {
  const m1 = YEARS_THEN_EXPERIENCE_RE.exec(text);
  if (m1) return Number(m1[1]);
  const m2 = EXPERIENCE_THEN_YEARS_RE.exec(text);
  if (m2) return Number(m2[2]);
  return null;
}

function extractRemoteFromRestriction(text: string): string | null {
  const match = REMOTE_FROM_RE.exec(text);
  if (!match) return null;
  const location = match[1].trim();
  if (location === "" || INCLUSIVE_REMOTE_RE.test(location)) return null;
  return location;
}

export function checkAutoDiscardReason(text: string): string | null {
  const foreignLanguage = detectForeignLanguage(text);
  if (foreignLanguage) return `Página não está em português/inglês/espanhol (idioma detetado: ${foreignLanguage})`;

  const haystack = text.toLowerCase();
  const usOnly = US_ONLY_KEYWORDS.find((kw) => haystack.includes(kw));
  if (usOnly) return `Vaga restrita aos EUA ("${usOnly}")`;

  const remoteFrom = extractRemoteFromRestriction(text);
  if (remoteFrom) return `Remoto restrito a: ${remoteFrom}`;

  const years = extractYearsRequirement(text);
  if (years !== null && years >= MIN_YEARS_TO_EXCLUDE) return `Exige ${years}+ anos de experiência`;

  return null;
}

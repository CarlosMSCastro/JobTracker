import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sources = [
  {
    name: "ITJobs.pt",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "itjobs" }),
  },
  {
    name: "Remotive",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "remotive" }),
  },
  {
    name: "Arbeitnow",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "arbeitnow" }),
  },
  {
    name: "Jooble",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    // inativa por defeito: a chave grátis tem um limite vitalício de 500 pedidos, por isso fica
    // de fora do refresh em massa e só é usada através do botão dedicado na página de Fontes.
    active: false,
    config: JSON.stringify({ fetcherKey: "jooble" }),
    requestLimit: 500,
  },
  {
    name: "Net-Empregos",
    type: "RSS" as const,
    profile: "CARLOS" as const,
    area: null,
    active: true,
    config: JSON.stringify({ fetcherKey: "netempregos" }),
  },
  {
    name: "RemoteOK",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "remoteok" }),
  },
  {
    name: "Jobicy",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "jobicy" }),
  },
  {
    name: "WeWorkRemotely",
    type: "RSS" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "weworkremotely" }),
  },
  {
    name: "Expresso Emprego",
    type: "RSS" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "expressoemprego" }),
  },
  {
    name: "Working Nomads",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "workingnomads" }),
  },
  {
    name: "Teamlyzer",
    type: "SCRAPER" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "teamlyzer" }),
  },
  {
    name: "Empregos.org",
    type: "SCRAPER" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "empregos" }),
  },
  {
    name: "Indeed",
    type: "SCRAPER" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    // Só a 1ª página de cada pesquisa é acessível sem login — sujeito a bloqueios pontuais do
    // Cloudflare/Indeed; ver src/lib/sources/indeed.ts. Falhas ficam visíveis na página de Fontes.
    active: true,
    config: JSON.stringify({ fetcherKey: "indeed" }),
  },
  {
    name: "LinkedIn (manual)",
    type: "MANUAL" as const,
    profile: "CARLOS" as const,
    area: null,
    active: true,
    config: null,
  },
  {
    name: "Emprego XL",
    type: "RSS" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "empregoxl" }),
  },
  {
    name: "Sapo Emprego",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "sapoemprego" }),
  },
  {
    name: "EURES",
    type: "API" as const,
    profile: "CARLOS" as const,
    area: "Dev/TI",
    // API não-oficial (descoberta por inspeção de rede, não documentada) — ver src/lib/sources/eures.ts.
    active: true,
    config: JSON.stringify({ fetcherKey: "eures" }),
  },

  // --- Perfil da Karol (Gestão de Eventos / Marketing / Administrativo) ---
  // Mesmos fetchers do Carlos, cada um com um ramo profile === "KAROL" próprio (ver cada
  // src/lib/sources/*.ts). Empregos.org fica de fora: CATEGORY_IDS hardcoded e sem forma conhecida
  // de descobrir categorias de eventos/marketing (ver plano). "LinkedIn (manual)" duplicada só por
  // simetria, para a Karol poder adicionar vagas manualmente tal como o Carlos.
  {
    name: "ITJobs.pt (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    // API dedicada só a vagas de TI — mantida por consistência mas espera-se ~0 vagas sempre.
    active: true,
    config: JSON.stringify({ fetcherKey: "itjobs" }),
  },
  {
    name: "Remotive (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "remotive" }),
  },
  {
    name: "Arbeitnow (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "arbeitnow" }),
  },
  {
    name: "Jooble (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    // Partilha o limite vitalício de 500 pedidos com a chave da Jooble do Carlos — mantida inativa
    // por defeito pela mesma razão.
    active: false,
    config: JSON.stringify({ fetcherKey: "jooble" }),
    requestLimit: 500,
  },
  {
    name: "Net-Empregos (Karol)",
    type: "RSS" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "netempregos" }),
  },
  {
    name: "RemoteOK (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "remoteok" }),
  },
  {
    name: "Jobicy (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "jobicy" }),
  },
  {
    name: "WeWorkRemotely (Karol)",
    type: "RSS" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "weworkremotely" }),
  },
  {
    name: "Expresso Emprego (Karol)",
    type: "RSS" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "expressoemprego" }),
  },
  {
    name: "Working Nomads (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "workingnomads" }),
  },
  {
    name: "Teamlyzer (Karol)",
    type: "SCRAPER" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "teamlyzer" }),
  },
  {
    name: "Indeed (Karol)",
    type: "SCRAPER" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "indeed" }),
  },
  {
    name: "LinkedIn (manual, Karol)",
    type: "MANUAL" as const,
    profile: "KAROL" as const,
    area: null,
    active: true,
    config: null,
  },
  {
    name: "Emprego XL (Karol)",
    type: "RSS" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "empregoxl" }),
  },
  {
    name: "Sapo Emprego (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "sapoemprego" }),
  },
  {
    name: "EURES (Karol)",
    type: "API" as const,
    profile: "KAROL" as const,
    area: "Eventos/Marketing",
    active: true,
    config: JSON.stringify({ fetcherKey: "eures" }),
  },
];

async function main() {
  for (const source of sources) {
    await prisma.source.upsert({
      where: { name: source.name },
      update: { requestLimit: "requestLimit" in source ? source.requestLimit : null },
      create: source,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

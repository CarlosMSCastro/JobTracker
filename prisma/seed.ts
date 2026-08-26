import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sources = [
  {
    name: "ITJobs.pt",
    type: "API" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "itjobs" }),
  },
  {
    name: "Remotive",
    type: "API" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "remotive" }),
  },
  {
    name: "Arbeitnow",
    type: "API" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "arbeitnow" }),
  },
  {
    name: "Jooble",
    type: "API" as const,
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
    area: null,
    active: true,
    config: JSON.stringify({ fetcherKey: "netempregos" }),
  },
  {
    name: "RemoteOK",
    type: "API" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "remoteok" }),
  },
  {
    name: "Jobicy",
    type: "API" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "jobicy" }),
  },
  {
    name: "WeWorkRemotely",
    type: "RSS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "weworkremotely" }),
  },
  {
    name: "Expresso Emprego",
    type: "RSS" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "expressoemprego" }),
  },
  {
    name: "Working Nomads",
    type: "API" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "workingnomads" }),
  },
  {
    name: "Teamlyzer",
    type: "SCRAPER" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "teamlyzer" }),
  },
  {
    name: "Empregos.org",
    type: "SCRAPER" as const,
    area: "Dev/TI",
    active: true,
    config: JSON.stringify({ fetcherKey: "empregos" }),
  },
  {
    name: "Indeed",
    type: "SCRAPER" as const,
    area: "Dev/TI",
    // Só a 1ª página de cada pesquisa é acessível sem login — sujeito a bloqueios pontuais do
    // Cloudflare/Indeed; ver src/lib/sources/indeed.ts. Falhas ficam visíveis na página de Fontes.
    active: true,
    config: JSON.stringify({ fetcherKey: "indeed" }),
  },
  {
    name: "LinkedIn (manual)",
    type: "MANUAL" as const,
    area: null,
    active: true,
    config: null,
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

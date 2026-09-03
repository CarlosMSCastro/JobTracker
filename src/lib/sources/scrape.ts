import Firecrawl from "firecrawl";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

// Headers de um pedido de browser real — usados só na estratégia de fetch direto (ver useFirecrawl
// abaixo). Referer é preenchido por pedido (origem do próprio URL) em vez de fixo aqui.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
};

// process.env.VERCEL vem a "1" em qualquer deployment na Vercel (prod e preview) e nunca em `next
// dev` local — usado para decidir a estratégia de scraping por omissão. O net-empregos.com bloqueia
// pedidos vindos de IPs de datacenter (inclui a Vercel) independentemente dos headers enviados, por
// isso em produção é preciso o Firecrawl (pedido feito a partir da infraestrutura dele, consome
// créditos); em localhost o IP é doméstico e passa no fetch direto, sem gastar créditos — pedido
// explícito do utilizador para poder atualizar a BD localmente sem depender do Firecrawl.
const useFirecrawlByDefault = !!process.env.VERCEL;

// Vai buscar o HTML de vários URLs, devolvendo um mapa url -> rawHtml. URLs que falharam (bloqueados,
// timeout, erro de rede) simplesmente não entram no mapa — quem chama trata a ausência como "sem
// dados para este URL", igual ao comportamento antigo do Firecrawl.
export async function batchFetchHtml(
  urls: string[],
  options?: { encoding?: "utf-8" | "iso-8859-1"; forceFirecrawl?: boolean },
): Promise<Map<string, string>> {
  const html = new Map<string, string>();
  const encoding = options?.encoding ?? "utf-8";

  if (useFirecrawlByDefault || options?.forceFirecrawl) {
    const job = await firecrawl.batchScrape(urls, { options: { formats: ["rawHtml"] }, pollInterval: 2, timeout: 50 });
    for (const doc of job.data) {
      const sourceUrl = doc.metadata?.sourceURL ?? doc.metadata?.url;
      if (sourceUrl && doc.rawHtml) html.set(sourceUrl, doc.rawHtml);
    }
    return html;
  }

  await Promise.all(
    urls.map(async (url) => {
      const referer = `${new URL(url).origin}/`;
      const res = await fetch(url, { headers: { ...BROWSER_HEADERS, Referer: referer } });
      if (!res.ok) return;
      const buffer = await res.arrayBuffer();
      html.set(url, new TextDecoder(encoding).decode(buffer));
    }),
  );
  return html;
}

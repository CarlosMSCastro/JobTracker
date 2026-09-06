export type NormalizedJob = {
  externalId?: string;
  title: string;
  company: string;
  location?: string;
  remoteType?: "REMOTO" | "PRESENCIAL" | "HIBRIDO";
  tags?: string[];
  isInternship?: boolean;
  url: string;
  publishedAt?: Date;
  // Texto completo da descrição, já conhecido no momento do fetch (ex: vem na própria resposta da
  // API da fonte). Usado pelo autodiscard em fontes cuja página de destino é uma SPA sem conteúdo
  // no HTML servido (ver eures.ts) — poupa-lhe ter de ir buscar de novo uma página que está vazia.
  descriptionText?: string;
};

export type SourceConfig = Record<string, string | undefined>;

export type Fetcher = (config: SourceConfig) => Promise<NormalizedJob[]>;

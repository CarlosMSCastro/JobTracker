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
};

export type SourceConfig = Record<string, string | undefined>;

export type Fetcher = (config: SourceConfig) => Promise<NormalizedJob[]>;

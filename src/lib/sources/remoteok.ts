import { hasAiSignal, isItRelevant } from "./relevance";
import type { Fetcher, NormalizedJob } from "./types";

type RemoteOkJob = {
  id: string;
  slug: string;
  date: string;
  company: string;
  position: string;
  tags: string[];
  location: string;
  apply_url: string;
  url: string;
};

export const fetchRemoteOk: Fetcher = async () => {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as unknown[];
  const jobs: NormalizedJob[] = [];

  for (const entry of data) {
    const job = entry as Partial<RemoteOkJob>;
    if (!job.id || !job.position) continue; // salta o item de legal notice do início do array

    // Filtrar só pelo título: muitas vagas "Various"/multi-departamento vêm com tags genéricas
    // (ex: "engineer", "exec", "ops") em posições completamente não-técnicas (bombeiro, manutenção),
    // o que gerava falsos positivos quando o filtro também olhava para as tags.
    if (!isItRelevant(job.position)) continue;

    const haystack = `${job.position} ${job.tags?.join(" ") ?? ""}`;
    const tags = job.tags ?? [];
    if (hasAiSignal(haystack) && !tags.includes("AI")) tags.push("AI");

    jobs.push({
      externalId: job.id,
      title: job.position,
      company: job.company ?? "Desconhecida",
      location: job.location || undefined,
      remoteType: "REMOTO",
      tags,
      url: job.url ?? job.apply_url ?? `https://remoteok.com/remote-jobs/${job.id}`,
      publishedAt: job.date ? new Date(job.date) : undefined,
    });
  }

  return jobs;
};

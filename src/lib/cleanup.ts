import { prisma } from "./db";

// Vagas nestes estados nunca são apagadas por idade — só as candidaturas ativas/com sucesso.
// Nova, Desisti e Rejeitada são apagadas quando antigas (pedido explícito do utilizador).
const KEEP_STATUSES = ["APLICADA", "ENTREVISTA", "OFERTA"] as const;
const MAX_AGE_DAYS = 14;

export async function cleanupOldJobs() {
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.job.deleteMany({
    where: { publishedAt: { lt: cutoff }, status: { notIn: [...KEEP_STATUSES] } },
  });
  return { deleted: result.count, cutoffDate: cutoff.toISOString() };
}

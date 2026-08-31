"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";

type Job = {
  id: string;
  title: string;
  company: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  source: { name: string };
};

const APPLICATION_STATUSES = ["APLICADA", "ENTREVISTA", "OFERTA", "REJEITADA", "DESISTI"];

export function ApplicationsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(APPLICATION_STATUSES.map((status) => fetch(`/api/jobs?status=${status}`).then((r) => r.json())))
      .then((results) => {
        const all = results.flatMap((r) => r.jobs ?? []) as Job[];
        all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setJobs(all);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Candidaturas</h1>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {loading && <p className="p-4 text-sm text-muted">A carregar...</p>}
        {!loading && jobs.length === 0 && (
          <p className="p-4 text-sm text-muted">
            Ainda não marcaste nenhuma vaga como aplicada. Muda o estado de uma vaga na lista principal.
          </p>
        )}
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/vagas/${job.id}`}
            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-background/40"
          >
            <div>
              <p className="font-medium text-foreground">{job.title}</p>
              <p className="text-sm text-muted">
                {job.company} · {job.source.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                atualizado {new Date(job.updatedAt).toLocaleDateString("pt-PT")}
              </span>
              <span
                className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLORS[job.status]}`}
              >
                {STATUS_LABELS[job.status]}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

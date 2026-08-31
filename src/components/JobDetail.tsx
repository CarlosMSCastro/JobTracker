"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REMOTE_LABELS, STATUS_LABELS } from "@/lib/labels";

type StatusEvent = { id: string; status: string; note: string | null; changedAt: string };

type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: string | null;
  tags: string | null;
  isInternship: boolean;
  url: string;
  publishedAt: string | null;
  status: string;
  autoExcluded: boolean;
  autoExcludeReason: string | null;
  notes: string | null;
  source: { name: string };
  statusHistory: StatusEvent[];
};

export function JobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data.job);
        setNotes(data.job?.notes ?? "");
      });
  }, [jobId]);

  async function updateStatus(status: string) {
    if (!job) return;
    setJob({ ...job, status });
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await res.json();
    setJob(data.job);
  }

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
  }

  if (!job) return <p className="text-sm text-muted">A carregar...</p>;

  const tags = job.tags ? job.tags.split(",").filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Voltar às vagas
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{job.title}</h1>
        <p className="mt-1 text-muted">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
          {job.remoteType ? ` · ${REMOTE_LABELS[job.remoteType]}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Fonte: {job.source.name}</span>
          {job.publishedAt && <span>· Publicada {new Date(job.publishedAt).toLocaleDateString("pt-PT")}</span>}
          {job.isInternship && <span className="rounded border border-border bg-background px-1.5 py-0.5 text-muted">Estágio</span>}
          {job.autoExcluded && (
            <span className="rounded border border-warn-text/30 bg-warn-bg px-1.5 py-0.5 text-warn-text">
              Auto-descartada{job.autoExcludeReason ? `: ${job.autoExcludeReason}` : ""}
            </span>
          )}
          {tags.map((tag) => (
            <span key={tag} className="rounded bg-tag-bg px-1.5 py-0.5 text-tag-text">
              {tag}
            </span>
          ))}
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background"
        >
          Abrir vaga original ↗
        </a>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">Estado:</label>
        <select
          value={job.status}
          onChange={(e) => updateStatus(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Notas pessoais</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={5}
          className="rounded-md border border-border bg-surface p-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="Ex: enviei CV a 12/08, contacto do recrutador, texto da candidatura, motivo de descartar..."
        />
        {saving && <span className="text-xs text-muted">A guardar...</span>}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Timeline</h2>
        <ul className="flex flex-col gap-2 border-l border-border pl-4">
          {job.statusHistory.length === 0 && <li className="text-sm text-muted">Sem mudanças de estado ainda.</li>}
          {job.statusHistory.map((event) => (
            <li key={event.id} className="text-sm">
              <span className="font-medium text-foreground">{STATUS_LABELS[event.status] ?? event.status}</span>
              <span className="text-muted"> — {new Date(event.changedAt).toLocaleString("pt-PT")}</span>
              {event.note && <p className="text-muted">{event.note}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

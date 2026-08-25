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
  country: string | null;
  area: string;
  tags: string | null;
  isInternship: boolean;
  url: string;
  publishedAt: string | null;
  status: string;
  notes: string | null;
  applicationText: string | null;
  source: { name: string };
  statusHistory: StatusEvent[];
};

export function JobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [notes, setNotes] = useState("");
  const [applicationText, setApplicationText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingApplicationText, setSavingApplicationText] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(async (data) => {
        setJob(data.job);
        setNotes(data.job?.notes ?? "");
        setApplicationText(data.job?.applicationText ?? "");
        if (data.job?.status === "NOVA") {
          await fetch(`/api/jobs/${jobId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "VISTA" }),
          });
          const refreshed = await fetch(`/api/jobs/${jobId}`).then((r) => r.json());
          setJob(refreshed.job);
        }
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

  async function saveApplicationText() {
    setSavingApplicationText(true);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationText }),
    });
    setSavingApplicationText(false);
  }

  if (!job) return <p className="text-sm text-neutral-500">A carregar...</p>;

  const tags = job.tags ? job.tags.split(",").filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-200">
        ← Voltar às vagas
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-neutral-100">{job.title}</h1>
        <p className="mt-1 text-neutral-400">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
          {job.remoteType ? ` · ${REMOTE_LABELS[job.remoteType]}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <span>Fonte: {job.source.name}</span>
          {job.publishedAt && <span>· Publicada {new Date(job.publishedAt).toLocaleDateString("pt-PT")}</span>}
          {job.isInternship && <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">Estágio</span>}
          {tags.map((tag) => (
            <span key={tag} className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-indigo-300">
              {tag}
            </span>
          ))}
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Abrir vaga original ↗
        </a>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-neutral-300">Estado:</label>
        <select
          value={job.status}
          onChange={(e) => updateStatus(e.target.value)}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-300">Notas pessoais</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={5}
          className="rounded-md border border-neutral-800 bg-neutral-900 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none"
          placeholder="Ex: enviei CV a 12/08, contacto do recrutador..."
        />
        {saving && <span className="text-xs text-neutral-500">A guardar...</span>}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-300">Texto da candidatura</label>
        <textarea
          value={applicationText}
          onChange={(e) => setApplicationText(e.target.value)}
          onBlur={saveApplicationText}
          rows={8}
          className="rounded-md border border-neutral-800 bg-neutral-900 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none"
          placeholder="Cola aqui o email enviado, ou o texto usado numa caixa de candidatura do site..."
        />
        {savingApplicationText && <span className="text-xs text-neutral-500">A guardar...</span>}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-300">Timeline</h2>
        <ul className="flex flex-col gap-2 border-l border-neutral-800 pl-4">
          {job.statusHistory.length === 0 && (
            <li className="text-sm text-neutral-500">Sem mudanças de estado ainda.</li>
          )}
          {job.statusHistory.map((event) => (
            <li key={event.id} className="text-sm">
              <span className="font-medium text-neutral-200">{STATUS_LABELS[event.status] ?? event.status}</span>
              <span className="text-neutral-500"> — {new Date(event.changedAt).toLocaleString("pt-PT")}</span>
              {event.note && <p className="text-neutral-400">{event.note}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

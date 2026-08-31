"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DATE_PRESETS, REMOTE_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";

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
  source: { name: string };
};

type Source = { id: string; name: string; active: boolean };

const FIELD_CLASS =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

const CHIP_CLASS =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm transition-colors";

const REMOTE_OPTIONS = [
  { value: "REMOTO", label: "Remoto" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "HIBRIDO", label: "Híbrido" },
];

const EMPTY_FILTERS = {
  remoteType: [] as string[],
  region: [] as string[],
  sourceId: [] as string[],
  isInternship: false,
  q: "",
  datePreset: "",
};

type Filters = typeof EMPTY_FILTERS;

const FILTERS_STORAGE_KEY = "job-tracker:filters";

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function JobsDashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((data) => setSources(data.sources ?? []));
  }, []);

  // Carrega os filtros guardados do browser (localStorage) na primeira renderização — feito num
  // efeito, não no useState inicial, para o HTML do servidor e do cliente baterem certo no
  // primeiro render (o servidor nunca tem acesso ao localStorage do utilizador).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (raw) setFilters((f) => ({ ...f, ...JSON.parse(raw) }));
    } catch {
      // localStorage indisponível ou JSON inválido — ignora e segue com os filtros vazios
    }
    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!filtersLoaded) return;
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters, filtersLoaded]);

  const sourceOptions = useMemo(() => sources.map((s) => ({ value: s.id, label: s.name })), [sources]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    filters.remoteType.forEach((v) => params.append("remoteType", v));
    filters.region.forEach((v) => params.append("region", v));
    filters.sourceId.forEach((v) => params.append("sourceId", v));
    // A vagas por triar é sempre "Nova" — vagas já tratadas (aplicada, desisti, etc.) vivem na
    // página Candidaturas, não aqui. Ver src/components/ApplicationsList.tsx.
    params.set("status", "NOVA");
    if (filters.isInternship) params.set("isInternship", "true");
    if (filters.q) params.set("q", filters.q);
    if (filters.datePreset) params.set("dateFrom", daysAgoIso(Number(filters.datePreset)));
    return params.toString();
  }, [filters]);

  const loadJobs = useCallback(() => {
    setLoading(true);
    fetch(`/api/jobs?${query}`)
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    if (!filtersLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-filter-change needs a loading flag
    loadJobs();
  }, [loadJobs, filtersLoaded]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      const totalCreated = (data.summaries ?? []).reduce(
        (acc: number, s: { created: number }) => acc + s.created,
        0,
      );
      setRefreshMessage(`${totalCreated} vaga(s) nova(s) encontradas.`);
      loadJobs();
    } catch {
      setRefreshMessage("Falhou o refresh — tenta novamente.");
    } finally {
      setRefreshing(false);
    }
  }

  async function quickSetStatus(jobId: string, status: string) {
    // Esta lista só mostra "Nova" (ver query acima) — mudar para outro estado tira a vaga da vista
    // na hora, em vez de a deixar ali marcada como tratada. Ela passa a viver em Candidaturas.
    if (status === "NOVA") {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    } else {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setTotal((t) => Math.max(0, t - 1));
    }
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const modalidadeActive = filters.remoteType.length > 0 || filters.region.length > 0;
  const modalidadeLabel =
    filters.remoteType.length === 1
      ? REMOTE_OPTIONS.find((o) => o.value === filters.remoteType[0])?.label
      : filters.remoteType.length > 1
        ? `Modalidade (${filters.remoteType.length})`
        : "Modalidade";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold">Vagas</h1>
          <span className="tabular-nums text-sm text-muted">
            {loading ? "a contar..." : `${total} ${total === 1 ? "vaga" : "vagas"}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {refreshMessage && <span className="text-sm text-muted">{refreshMessage}</span>}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
          >
            {refreshing ? "A procurar..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Pesquisar título ou empresa..."
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className={`min-w-[200px] flex-1 ${FIELD_CLASS}`}
        />
        <FilterDropdown label={modalidadeLabel ?? "Modalidade"} active={modalidadeActive}>
          <div className="flex flex-col gap-1">
            {REMOTE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={filters.remoteType.includes(opt.value)}
                  onChange={() => setFilters((f) => ({ ...f, remoteType: toggle(f.remoteType, opt.value) }))}
                  className="accent-accent"
                />
                {opt.label}
              </label>
            ))}
            <label className="mt-1 flex items-center gap-1.5 border-l border-border pl-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={filters.region.includes("norte")}
                onChange={() => setFilters((f) => ({ ...f, region: toggle(f.region, "norte") }))}
                className="accent-accent"
              />
              Só Zona Norte (Presencial/Híbrido)
            </label>
          </div>
        </FilterDropdown>
        <FilterDropdown
          label={filters.sourceId.length ? `Fonte (${filters.sourceId.length})` : "Fonte"}
          active={filters.sourceId.length > 0}
        >
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {sourceOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={filters.sourceId.includes(opt.value)}
                  onChange={() => setFilters((f) => ({ ...f, sourceId: toggle(f.sourceId, opt.value) }))}
                  className="accent-accent"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </FilterDropdown>
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, isInternship: !f.isInternship }))}
          className={`${CHIP_CLASS} ${
            filters.isInternship ? "border-accent bg-tag-bg text-accent" : "border-border bg-surface text-foreground"
          }`}
        >
          Estágio
        </button>
        <select
          value={filters.datePreset}
          onChange={(e) => setFilters((f) => ({ ...f, datePreset: e.target.value }))}
          className={FIELD_CLASS}
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {loading && <p className="p-4 text-sm text-muted">A carregar...</p>}
        {!loading && jobs.length === 0 && <p className="p-4 text-sm text-muted">Sem vagas para estes filtros.</p>}
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} onQuickStatus={quickSetStatus} />
        ))}
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${CHIP_CLASS} ${active ? "border-accent bg-tag-bg text-accent" : "border-border bg-surface text-foreground"}`}
      >
        {label}
        <span className="text-xs text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1.5 min-w-[220px] rounded-md border border-border bg-surface p-3 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

function JobRow({ job, onQuickStatus }: { job: Job; onQuickStatus: (id: string, status: string) => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-background/40">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <Link href={`/vagas/${job.id}`} className="font-medium text-foreground hover:text-accent hover:underline">
            {job.title}
          </Link>
        </p>
        <p className="truncate text-xs text-muted">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
          {job.remoteType ? ` · ${REMOTE_LABELS[job.remoteType]}` : ""} · {job.source.name}
          {job.publishedAt ? ` · ${new Date(job.publishedAt).toLocaleDateString("pt-PT")}` : ""}
        </p>
      </div>
      {job.isInternship && (
        <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted">
          Estágio
        </span>
      )}
      {job.autoExcluded && (
        <span
          title={job.autoExcludeReason ?? undefined}
          className="shrink-0 rounded border border-warn-text/30 bg-warn-bg px-1.5 py-0.5 text-xs text-warn-text"
        >
          Auto-descartada
        </span>
      )}
      <select
        value={job.status}
        onChange={(e) => onQuickStatus(job.id, e.target.value)}
        className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLORS[job.status]}`}
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <a
        href={job.url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-background"
      >
        Abrir
      </a>
    </div>
  );
}

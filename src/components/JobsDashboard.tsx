"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DATE_PRESETS, REMOTE_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/labels";

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
  autoExcluded: boolean;
  autoExcludeReason: string | null;
  source: { name: string };
};

type Source = { id: string; name: string; active: boolean };

const FIELD_CLASS =
  "rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-indigo-500 focus:outline-none";

const AREA_OPTIONS = [
  { value: "Dev/TI", label: "Dev/TI" },
  { value: "Helpdesk", label: "Helpdesk" },
  { value: "Backoffice", label: "Backoffice" },
  { value: "Admin", label: "Admin" },
];

const REMOTE_OPTIONS = [
  { value: "REMOTO", label: "Remoto" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "HIBRIDO", label: "Híbrido" },
];

const COUNTRY_OPTIONS = [{ value: "Portugal", label: "Portugal" }];

const REGION_OPTIONS = [{ value: "norte", label: "Norte (Porto/Braga/Guimarães)" }];

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

const EMPTY_FILTERS = {
  area: [] as string[],
  remoteType: [] as string[],
  country: [] as string[],
  region: [] as string[],
  sourceId: [] as string[],
  status: [] as string[],
  isInternship: false,
  includeAutoExcluded: false,
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
    filters.area.forEach((v) => params.append("area", v));
    filters.remoteType.forEach((v) => params.append("remoteType", v));
    filters.country.forEach((v) => params.append("country", v));
    filters.region.forEach((v) => params.append("region", v));
    filters.sourceId.forEach((v) => params.append("sourceId", v));
    filters.status.forEach((v) => params.append("status", v));
    if (filters.isInternship) params.set("isInternship", "true");
    if (filters.includeAutoExcluded) params.set("includeAutoExcluded", "true");
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
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold">Vagas</h1>
          <span className="text-sm text-neutral-500 tabular-nums">
            {loading ? "a contar..." : `${total} ${total === 1 ? "vaga" : "vagas"}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {refreshMessage && <span className="text-sm text-neutral-400">{refreshMessage}</span>}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {refreshing ? "A procurar..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Pesquisar título ou empresa..."
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            className={`min-w-[220px] flex-1 ${FIELD_CLASS}`}
          />
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
              className="rounded-md px-2 py-1.5 text-sm text-neutral-500 hover:text-neutral-200"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 border-t border-neutral-800 pt-3">
          <CheckboxGroup
            label="Área"
            options={AREA_OPTIONS}
            selected={filters.area}
            onChange={(v) => setFilters((f) => ({ ...f, area: v }))}
          />
          <CheckboxGroup
            label="Modalidade"
            options={REMOTE_OPTIONS}
            selected={filters.remoteType}
            onChange={(v) => setFilters((f) => ({ ...f, remoteType: v }))}
          />
          <CheckboxGroup
            label="País"
            options={COUNTRY_OPTIONS}
            selected={filters.country}
            onChange={(v) => setFilters((f) => ({ ...f, country: v }))}
          />
          <CheckboxGroup
            label="Zona"
            options={REGION_OPTIONS}
            selected={filters.region}
            onChange={(v) => setFilters((f) => ({ ...f, region: v }))}
          />
          <CheckboxGroup
            label="Fonte"
            options={sourceOptions}
            selected={filters.sourceId}
            onChange={(v) => setFilters((f) => ({ ...f, sourceId: v }))}
          />
          <CheckboxGroup
            label="Estado"
            options={STATUS_OPTIONS}
            selected={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Estágio</span>
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={filters.isInternship}
                onChange={(e) => setFilters((f) => ({ ...f, isInternship: e.target.checked }))}
                className="accent-indigo-500"
              />
              Só estágios
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Auto-descartadas</span>
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={filters.includeAutoExcluded}
                onChange={(e) => setFilters((f) => ({ ...f, includeAutoExcluded: e.target.checked }))}
                className="accent-indigo-500"
              />
              Mostrar descartadas automaticamente
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900/40">
        {loading && <p className="p-4 text-sm text-neutral-500">A carregar...</p>}
        {!loading && jobs.length === 0 && (
          <p className="p-4 text-sm text-neutral-500">Sem vagas para estes filtros.</p>
        )}
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} onQuickStatus={quickSetStatus} />
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      <div className="flex flex-col gap-1">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onChange(toggle(selected, opt.value))}
              className="accent-indigo-500"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function JobRow({ job, onQuickStatus }: { job: Job; onQuickStatus: (id: string, status: string) => void }) {
  const tags = job.tags ? job.tags.split(",").filter(Boolean) : [];

  return (
    <div className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-neutral-900/60">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          {job.status === "NOVA" && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />}
          <Link href={`/vagas/${job.id}`} className="truncate font-medium text-neutral-100 hover:text-indigo-300 hover:underline">
            {job.title}
          </Link>
          {job.isInternship && (
            <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
              Estágio
            </span>
          )}
          {job.autoExcluded && (
            <span
              title={job.autoExcludeReason ?? undefined}
              className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-300"
            >
              Auto-descartada{job.autoExcludeReason ? `: ${job.autoExcludeReason}` : ""}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-400">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
          {job.remoteType ? ` · ${REMOTE_LABELS[job.remoteType]}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
          <span>{job.source.name}</span>
          {job.publishedAt && (
            <span>· {new Date(job.publishedAt).toLocaleDateString("pt-PT")}</span>
          )}
          {tags.map((tag) => (
            <span key={tag} className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-indigo-300">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={job.status}
          onChange={(e) => onQuickStatus(job.id, e.target.value)}
          className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${STATUS_COLORS[job.status]}`}
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
          className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
        >
          Abrir
        </a>
      </div>
    </div>
  );
}

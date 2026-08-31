"use client";

import { useEffect, useState } from "react";

type Source = {
  id: string;
  name: string;
  type: string;
  area: string | null;
  active: boolean;
  lastFetch: string | null;
  requestCount: number;
  requestLimit: number | null;
};

export function SourcesList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((data) => setSources(data.sources ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleActive(source: Source) {
    setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, active: !s.active } : s)));
    await fetch("/api/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, active: !source.active }),
    });
  }

  async function fetchOnce(source: Source) {
    setFetchingId(source.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/sources/${source.id}/refresh`, { method: "POST" });
      const data = await res.json();
      const summary = data.summary as {
        created: number;
        skipped: number;
        error?: string;
        requestCount?: number;
        requestLimit?: number | null;
      };

      if (summary.error) {
        setMessage(`${source.name}: ${summary.error}`);
      } else {
        setMessage(`${source.name}: ${summary.created} vaga(s) nova(s) (${summary.skipped} já existiam).`);
      }
      load();
    } finally {
      setFetchingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Fontes</h1>
      {message && <p className="text-sm text-muted">{message}</p>}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {loading && <p className="p-4 text-sm text-muted">A carregar...</p>}
        {sources.map((source) => {
          const limitReached = source.requestLimit !== null && source.requestCount >= source.requestLimit;

          return (
            <div key={source.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-foreground">{source.name}</p>
                <p className="text-sm text-muted">
                  {source.type}
                  {source.area ? ` · ${source.area}` : ""}
                  {source.lastFetch
                    ? ` · última procura em ${new Date(source.lastFetch).toLocaleString("pt-PT")}`
                    : " · nunca procurada"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {source.requestLimit !== null && (
                  <>
                    <span
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide tabular-nums ${
                        limitReached ? "border-red-400/30 bg-red-500/10 text-red-300" : "border-border bg-background text-muted"
                      }`}
                    >
                      {source.requestCount}/{source.requestLimit}
                    </span>
                    <button
                      onClick={() => fetchOnce(source)}
                      disabled={fetchingId === source.id || limitReached}
                      className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background disabled:opacity-50"
                    >
                      {fetchingId === source.id
                        ? "A procurar..."
                        : limitReached
                          ? "Limite atingido"
                          : "Procurar mais 1"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => toggleActive(source)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                    source.active
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                      : "border-border bg-background text-muted"
                  }`}
                >
                  {source.active ? "Ativa" : "Inativa"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

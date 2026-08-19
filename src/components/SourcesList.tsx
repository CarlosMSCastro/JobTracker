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
      <h1 className="text-xl font-semibold text-neutral-100">Fontes</h1>
      {message && <p className="text-sm text-neutral-400">{message}</p>}
      <div className="flex flex-col divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900/40">
        {loading && <p className="p-4 text-sm text-neutral-500">A carregar...</p>}
        {sources.map((source) => {
          const limitReached = source.requestLimit !== null && source.requestCount >= source.requestLimit;

          return (
            <div key={source.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-neutral-100">{source.name}</p>
                <p className="text-sm text-neutral-500">
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
                      className={`rounded px-2 py-1 text-xs font-medium tabular-nums ${
                        limitReached ? "bg-red-500/15 text-red-300" : "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {source.requestCount}/{source.requestLimit}
                    </span>
                    <button
                      onClick={() => fetchOnce(source)}
                      disabled={fetchingId === source.id || limitReached}
                      className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
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
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    source.active ? "bg-green-500/15 text-green-300" : "bg-neutral-800 text-neutral-500"
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

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ObservationTypeBadge } from "../components/ObservationTypeBadge";
import { api } from "../lib/api";
import type { SearchResults } from "../types";

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { dateStyle: "short" });
}

export function SearchPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(submitted)}`),
    enabled: submitted.length >= 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(q.trim());
  };

  const results = data ?? { observations: [], people: [], systems: [] };
  const hasAny = results.observations.length > 0 || results.people.length > 0 || results.systems.length > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Search</h1>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search observations, people, systems (min 2 chars)"
          className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <button type="submit" className="px-3 py-2 bg-slate-800 text-white text-sm rounded hover:bg-slate-700">Search</button>
      </form>
      {submitted.length > 0 && submitted.length < 2 && <p className="text-slate-500 text-sm">Enter at least 2 characters.</p>}
      {submitted.length >= 2 && (
        <>
          {isLoading ? (
            <p className="text-slate-500">Searching…</p>
          ) : !hasAny ? (
            <p className="text-slate-500">No results for &quot;{submitted}&quot;</p>
          ) : (
            <div className="space-y-6">
              {results.observations.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-slate-700 mb-2">Observations</h2>
                  <ul className="space-y-2">
                    {results.observations.map((obs) => (
                      <li key={obs.id} className="bg-white rounded border border-slate-200 p-2 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/observations/${obs.id}`} className="font-medium hover:underline">{obs.title || "Untitled"}</Link>
                          <ObservationTypeBadge observationType={obs.observationType} />
                        </div>
                        <p className="text-slate-600 line-clamp-1 mt-0.5">{obs.observation}</p>
                        <p className="text-slate-400 text-xs mt-1">{formatDate(obs.capturedAt)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results.people.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-slate-700 mb-2">People</h2>
                  <ul className="space-y-1">
                    {results.people.map((p) => (
                      <li key={p.id}><Link to={`/people/${p.id}`} className="text-slate-700 hover:underline">{p.name}</Link>{p.title && <span className="text-slate-500 text-sm"> — {p.title}</span>}</li>
                    ))}
                  </ul>
                </div>
              )}
              {results.systems.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-slate-700 mb-2">Systems</h2>
                  <ul className="space-y-1">
                    {results.systems.map((s) => (
                      <li key={s.id}><Link to={`/systems/${s.id}`} className="text-slate-700 hover:underline">{s.name}</Link>{s.category && <span className="text-slate-500 text-sm"> — {s.category}</span>}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

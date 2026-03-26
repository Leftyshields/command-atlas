import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ObservationTypeBadge } from "../components/ObservationTypeBadge";
import { api } from "../lib/api";
import type { Observation } from "../types";

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { dateStyle: "short" });
}

export function ObservationsList() {
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["observations"],
    queryFn: () => api.get<Observation[]>("/observations"),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load"}</p>;

  if (list.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Observations</h1>
        <p className="text-slate-500">No observations yet. Use Capture in the header to add one.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Observations</h1>
      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-2 font-medium">Title / Preview</th>
              <th className="text-left p-2 font-medium w-24">Type</th>
              <th className="text-left p-2 font-medium">Captured</th>
            </tr>
          </thead>
          <tbody>
            {list.map((obs) => (
              <tr key={obs.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <Link to={`/observations/${obs.id}`} className="hover:underline font-medium">
                    {obs.title || "Untitled"}
                  </Link>
                  <p className="text-slate-600 line-clamp-1">{obs.observation}</p>
                </td>
                <td className="p-2">
                  <ObservationTypeBadge observationType={obs.observationType} />
                </td>
                <td className="p-2 text-slate-500">{formatDate(obs.capturedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

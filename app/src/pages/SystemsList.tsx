import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { System } from "../types";

export function SystemsList() {
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["systems"],
    queryFn: () => api.get<System[]>("/systems"),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load"}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Systems</h1>
        <Link to="/systems/new" className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700">Add system</Link>
      </div>
      {list.length === 0 ? (
        <p className="text-slate-500">No systems yet. Add one to link from observations.</p>
      ) : (
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-2 font-medium">Name</th>
                <th className="text-left p-2 font-medium">Category</th>
                <th className="text-left p-2 font-medium">Owner team</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2"><Link to={`/systems/${s.id}`} className="font-medium hover:underline">{s.name}</Link></td>
                  <td className="p-2 text-slate-600">{s.category ?? "—"}</td>
                  <td className="p-2 text-slate-600">{s.ownerTeam ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

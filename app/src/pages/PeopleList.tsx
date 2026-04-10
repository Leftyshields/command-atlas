import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { personLocationLabel } from "../lib/personLocation";
import type { Person } from "../types";

export function PeopleList() {
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<Person[]>("/people"),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load"}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">People</h1>
        <Link to="/people/new" className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700">Add person</Link>
      </div>
      {list.length === 0 ? (
        <p className="text-slate-500">No people yet. Add one to link from observations.</p>
      ) : (
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-2 font-medium">Name</th>
                <th className="text-left p-2 font-medium">Title</th>
                <th className="text-left p-2 font-medium">Team</th>
                <th className="text-left p-2 font-medium">Location</th>
                <th className="text-left p-2 font-medium">Manager</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2"><Link to={`/people/${p.id}`} className="font-medium hover:underline">{p.name}</Link></td>
                  <td className="p-2 text-slate-600">{p.title ?? "—"}</td>
                  <td className="p-2 text-slate-600">{p.team ?? "—"}</td>
                  <td className="p-2 text-slate-600">{personLocationLabel(p)}</td>
                  <td className="p-2 text-slate-600">{p.manager ? <Link to={`/people/${p.manager.id}`} className="hover:underline">{p.manager.name}</Link> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

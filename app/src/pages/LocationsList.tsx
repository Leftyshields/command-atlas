import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { SiteLocationOption } from "../types";

export function LocationsList() {
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["site-locations"],
    queryFn: () => api.get<SiteLocationOption[]>("/site-locations"),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load"}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Locations</h1>
        <Link to="/locations/new" className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700">
          Add location
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="text-slate-500">No site locations yet. Add one for people to select on their profile.</p>
      ) : (
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-2 font-medium">Code</th>
                <th className="text-left p-2 font-medium">Label</th>
                <th className="text-left p-2 font-medium">Sort</th>
              </tr>
            </thead>
            <tbody>
              {list.map((loc) => (
                <tr key={loc.code} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2">
                    <Link
                      to={`/locations/${encodeURIComponent(loc.code)}`}
                      className="font-medium hover:underline"
                    >
                      {loc.code}
                    </Link>
                  </td>
                  <td className="p-2 text-slate-700">{loc.label}</td>
                  <td className="p-2 text-slate-600">{loc.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

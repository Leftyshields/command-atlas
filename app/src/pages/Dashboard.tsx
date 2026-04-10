import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ObservationTypeBadge } from "../components/ObservationTypeBadge";
import { useCapture } from "../context/CaptureContext";
import { api } from "../lib/api";
import type { Observation } from "../types";

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { dateStyle: "short" });
}

export function Dashboard() {
  const { openCapture } = useCapture();
  const [exportingZip, setExportingZip] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { data: observations = [], isLoading } = useQuery({
    queryKey: ["observations"],
    queryFn: () => api.get<Observation[]>("/observations"),
  });
  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<{ id: string }[]>("/people"),
  });
  const { data: systems = [] } = useQuery({
    queryKey: ["systems"],
    queryFn: () => api.get<{ id: string }[]>("/systems"),
  });

  const recent = observations.slice(0, 10);

  if (isLoading) {
    return <p className="text-slate-500">Loading…</p>;
  }

  function downloadObsidianZip() {
    setExportingZip(true);
    setExportError(null);
    try {
      const a = document.createElement("a");
      a.href = "/api/export/obsidian.zip";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Zip export failed");
    } finally {
      setExportingZip(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/backup"
            className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50"
          >
            Backup & restore
          </Link>
          <button
            type="button"
            onClick={downloadObsidianZip}
            disabled={exportingZip}
            className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 disabled:opacity-60"
          >
            {exportingZip ? "Preparing zip…" : "Download Obsidian Zip"}
          </button>
          <button type="button" onClick={openCapture} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700">Capture</button>
        </div>
      </div>
      {exportError && <p className="text-sm text-red-600">{exportError}</p>}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-white rounded border border-slate-200 p-4">
          <p className="text-slate-500">People</p>
          <p className="text-2xl font-semibold">{people.length}</p>
          <Link to="/people" className="text-slate-600 hover:underline">View all</Link>
        </div>
        <div className="bg-white rounded border border-slate-200 p-4">
          <p className="text-slate-500">Systems</p>
          <p className="text-2xl font-semibold">{systems.length}</p>
          <Link to="/systems" className="text-slate-600 hover:underline">View all</Link>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-medium text-slate-700 mb-2">Recent observations</h2>
        {recent.length === 0 ? (
          <p className="text-slate-500 text-sm">No observations yet. Use Capture to add one.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((obs) => (
              <li key={obs.id} className="bg-white rounded border border-slate-200 p-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/observations/${obs.id}`} className="hover:underline font-medium">
                    {obs.title || "Untitled"}
                  </Link>
                  <ObservationTypeBadge observationType={obs.observationType} />
                </div>
                <p className="text-slate-600 mt-0.5 line-clamp-2">{obs.observation}</p>
                <p className="text-slate-400 text-xs mt-1">{formatDate(obs.capturedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

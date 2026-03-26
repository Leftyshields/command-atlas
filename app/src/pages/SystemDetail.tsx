import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { System } from "../types";

export function SystemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: system, isLoading, error } = useQuery({
    queryKey: ["systems", id],
    queryFn: () => api.get<System>(`/systems/${id!}`),
    enabled: !!id,
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", ownerTeam: "", description: "", notes: "" });

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<System>(`/systems/${id!}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems"] });
      setEditing(false);
    },
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/systems/${id!}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["systems"] });
      navigate("/systems");
    },
  });

  useEffect(() => {
    if (system && !editing) setForm({ name: system.name, category: system.category ?? "", ownerTeam: system.ownerTeam ?? "", description: system.description ?? "", notes: system.notes ?? "" });
  }, [system, editing]);

  if (!id || isLoading || error) {
    if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Not found"}</p>;
    return <p className="text-slate-500">Loading…</p>;
  }
  if (!system) return <p className="text-slate-500">Not found</p>;

  const linkedObs = system.linkedObservations ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{system.name}</h1>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <button type="button" onClick={() => setEditing(true)} className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100">Edit</button>
              <button type="button" onClick={() => del.mutate()} className="px-2 py-1 text-sm border border-red-200 text-red-700 rounded hover:bg-red-50">Delete</button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(false)} className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100">Cancel</button>
          )}
        </div>
      </div>
      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            patch.mutate(form);
          }}
        >
          <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Category</label><input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="e.g. platform, database" /></div>
          <div><label className="block text-sm font-medium mb-1">Owner team</label><input value={form.ownerTeam} onChange={(e) => setForm((p) => ({ ...p, ownerTeam: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <button type="submit" disabled={patch.isPending} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50">Save</button>
        </form>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Category</dt><dd>{system.category ?? "—"}</dd>
            <dt className="text-slate-500">Owner team</dt><dd>{system.ownerTeam ?? "—"}</dd>
          </dl>
          {system.description && <p className="text-sm text-slate-600">{system.description}</p>}
          {system.notes && <div className="prose prose-sm max-w-none"><SafeMarkdown>{system.notes}</SafeMarkdown></div>}
          {linkedObs.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Linked observations</h3>
              <ul className="space-y-2">
                {linkedObs.map((obs) => (
                  <li key={obs.id} className="bg-white rounded border border-slate-200 p-2 text-sm">
                    <Link to={`/observations/${obs.id}`} className="font-medium hover:underline">{obs.title || "Untitled"}</Link>
                    <p className="text-slate-600 line-clamp-1 mt-0.5">{obs.observation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {del.isError && <p className="text-red-600 text-sm">{del.error instanceof Error ? del.error.message : "Delete failed"}</p>}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ObservationTypeBadge } from "../components/ObservationTypeBadge";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { OBSERVATION_TYPE_OPTIONS } from "../constants/observationTypes";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Observation } from "../types";

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function ObservationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: obs, isLoading, error } = useQuery({
    queryKey: ["observations", id],
    queryFn: () => api.get<Observation>(`/observations/${id!}`),
    enabled: !!id,
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ observation: "", whyItMatters: "", context: "", title: "", observationType: "" });

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<Observation>(`/observations/${id!}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["observations"] });
      setEditing(false);
    },
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/observations/${id!}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["observations"] });
      navigate("/observations");
    },
  });

  useEffect(() => {
    if (obs) setForm({ observation: obs.observation, whyItMatters: obs.whyItMatters ?? "", context: obs.context ?? "", title: obs.title ?? "", observationType: obs.observationType ?? "" });
  }, [obs]);

  if (!id || isLoading || error) {
    if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Not found"}</p>;
    return <p className="text-slate-500">Loading…</p>;
  }
  if (!obs) return <p className="text-slate-500">Not found</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{obs.title || "Observation"}</h1>
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
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-slate-500 text-sm">Captured {formatDate(obs.capturedAt)}</p>
        {!editing && <ObservationTypeBadge observationType={obs.observationType} />}
      </div>
      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            patch.mutate({
              observation: form.observation,
              whyItMatters: form.whyItMatters || null,
              context: form.context || null,
              title: form.title || null,
              observationType: form.observationType || null,
            });
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Observation</label>
            <textarea value={form.observation} onChange={(e) => setForm((p) => ({ ...p, observation: e.target.value }))} required rows={4} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Why it matters</label>
            <textarea value={form.whyItMatters} onChange={(e) => setForm((p) => ({ ...p, whyItMatters: e.target.value }))} rows={2} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Context</label>
            <input value={form.context} onChange={(e) => setForm((p) => ({ ...p, context: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observation type</label>
            <select
              value={form.observationType}
              onChange={(e) => setForm((p) => ({ ...p, observationType: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="">None</option>
              {OBSERVATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" disabled={patch.isPending} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50">Save</button>
        </form>
      ) : (
        <>
          <div className="prose prose-sm max-w-none">
            <SafeMarkdown>{obs.observation}</SafeMarkdown>
          </div>
          {obs.whyItMatters && (
            <div>
              <h3 className="text-sm font-medium text-slate-700">Why it matters</h3>
              <div className="prose prose-sm max-w-none"><SafeMarkdown>{obs.whyItMatters}</SafeMarkdown></div>
            </div>
          )}
          {obs.context && <p className="text-slate-600 text-sm">Context: {obs.context}</p>}
          {(obs.linkedPeople?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700">Linked people</h3>
              <ul className="flex flex-wrap gap-2 mt-1">
                {obs.linkedPeople!.map((p) => (
                  <li key={p.id}><Link to={`/people/${p.id}`} className="text-slate-600 hover:underline">{p.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
          {(obs.linkedSystems?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700">Linked systems</h3>
              <ul className="flex flex-wrap gap-2 mt-1">
                {obs.linkedSystems!.map((s) => (
                  <li key={s.id}><Link to={`/systems/${s.id}`} className="text-slate-600 hover:underline">{s.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

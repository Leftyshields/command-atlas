import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ReportingStructure } from "../components/people/ReportingStructure";
import { api } from "../lib/api";
import { personLocationLabel } from "../lib/personLocation";
import type { Person, SiteLocationOption } from "../types";

export function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: person, isLoading, error } = useQuery({
    queryKey: ["people", id],
    queryFn: () => api.get<Person>(`/people/${id!}`),
    enabled: !!id,
  });
  const { data: peopleList = [] } = useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<Person[]>("/people"),
    enabled: !!id && !!person,
  });

  const { data: siteLocations = [] } = useQuery({
    queryKey: ["site-locations"],
    queryFn: () => api.get<SiteLocationOption[]>("/site-locations"),
    staleTime: 60 * 60 * 1000,
  });
  const [editing, setEditing] = useState(false);
  const [managerFilter, setManagerFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    title: "",
    team: "",
    department: "",
    location: "",
    managerId: "",
    notes: "",
  });

  const managerOptions = useMemo(() => {
    const others = peopleList.filter((p) => p.id !== id);
    const f = managerFilter.trim().toLowerCase();
    if (!f) return others;
    return others.filter((p) => p.name.toLowerCase().includes(f) || (p.title ?? "").toLowerCase().includes(f));
  }, [peopleList, id, managerFilter]);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<Person>(`/people/${id!}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people"] });
      setEditing(false);
    },
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/people/${id!}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people"] });
      navigate("/people");
    },
  });

  useEffect(() => {
    if (person && !editing)
      setForm({
        name: person.name,
        title: person.title ?? "",
        team: person.team ?? "",
        department: person.department ?? "",
        location: person.location ?? "",
        managerId: person.managerId ?? "",
        notes: person.notes ?? "",
      });
  }, [person, editing]);

  if (!id || isLoading || error) {
    if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Not found"}</p>;
    return <p className="text-slate-500">Loading…</p>;
  }
  if (!person) return <p className="text-slate-500">Not found</p>;

  const linkedObs = person.linkedObservations ?? [];
  const manager = person.manager;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{person.name}</h1>
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
            patch.mutate({
              ...form,
              managerId: form.managerId.trim() || null,
              location: form.location.trim() ? form.location : null,
            });
          }}
        >
          <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Title</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Team</label><input value={form.team} onChange={(e) => setForm((p) => ({ ...p, team: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">Department</label><input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div>
            <label htmlFor="person-edit-location" className="block text-sm font-medium mb-1">Location</label>
            <select
              id="person-edit-location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">—</option>
              {siteLocations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.label} ({loc.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Manager</label>
            <input
              type="text"
              placeholder="Search by name or title…"
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm mb-1"
            />
            <select
              value={form.managerId}
              onChange={(e) => setForm((p) => ({ ...p, managerId: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">— No manager</option>
              {managerOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.title ? ` (${p.title})` : ""}</option>
              ))}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <button type="submit" disabled={patch.isPending} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50">Save</button>
        </form>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Title</dt><dd>{person.title ?? "—"}</dd>
            <dt className="text-slate-500">Team</dt><dd>{person.team ?? "—"}</dd>
            <dt className="text-slate-500">Department</dt><dd>{person.department ?? "—"}</dd>
            <dt className="text-slate-500">Location</dt>
            <dd>{personLocationLabel(person)}</dd>
            <dt className="text-slate-500">Reports to</dt>
            <dd>{manager ? <Link to={`/people/${manager.id}`} className="hover:underline">{manager.name}</Link> : "—"}</dd>
          </dl>
          <ReportingStructure person={person} />
          {person.notes && <div className="prose prose-sm max-w-none"><SafeMarkdown>{person.notes}</SafeMarkdown></div>}
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

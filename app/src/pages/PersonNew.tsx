import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Person } from "../types";

export function PersonNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", title: "", team: "", department: "", managerId: "", notes: "" });
  const [managerFilter, setManagerFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<Person[]>("/people"),
  });

  const managerOptions = useMemo(() => {
    const f = managerFilter.trim().toLowerCase();
    if (!f) return people;
    return people.filter((p) => p.name.toLowerCase().includes(f) || (p.title ?? "").toLowerCase().includes(f));
  }, [people, managerFilter]);

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/people", {
        ...form,
        managerId: form.managerId.trim() || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["people"] });
      navigate(`/people/${data.id}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create"),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Add person</h1>
      <form
        className="space-y-3 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) {
            setError("Name is required");
            return;
          }
          create.mutate();
        }}
      >
        <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Title</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Team</label><input value={form.team} onChange={(e) => setForm((p) => ({ ...p, team: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Department</label><input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
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
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={create.isPending} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50">Create</button>
      </form>
    </div>
  );
}

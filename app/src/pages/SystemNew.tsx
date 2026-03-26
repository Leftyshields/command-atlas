import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function SystemNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", category: "", ownerTeam: "", description: "", notes: "" });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>("/systems", form),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["systems"] });
      navigate(`/systems/${data.id}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create"),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Add system</h1>
      <form
        className="space-y-3 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) { setError("Name is required"); return; }
          create.mutate();
        }}
      >
        <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Category</label><input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="e.g. platform, database" /></div>
        <div><label className="block text-sm font-medium mb-1">Owner team</label><input value={form.ownerTeam} onChange={(e) => setForm((p) => ({ ...p, ownerTeam: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={create.isPending} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50">Create</button>
      </form>
    </div>
  );
}

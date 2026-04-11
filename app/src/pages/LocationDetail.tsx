import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { SiteLocationOption } from "../types";

export function LocationDetail() {
  const { code: codeParam } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const code = codeParam ? decodeURIComponent(codeParam) : "";

  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["site-locations"],
    queryFn: () => api.get<SiteLocationOption[]>("/site-locations"),
    enabled: !!code,
  });

  const row = list.find((l) => l.code === code);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ code: "", label: "", sortOrder: "0" });
  const [formError, setFormError] = useState<string | null>(null);

  const patch = useMutation({
    mutationFn: (body: { code: string; label: string; sortOrder: number }) =>
      api.patch<SiteLocationOption>(`/site-locations/${encodeURIComponent(code)}`, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["site-locations"] });
      qc.invalidateQueries({ queryKey: ["people"] });
      setEditing(false);
      if (data.code !== code) {
        navigate(`/locations/${encodeURIComponent(data.code)}`, { replace: true });
      }
    },
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/site-locations/${encodeURIComponent(code)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-locations"] });
      qc.invalidateQueries({ queryKey: ["people"] });
      navigate("/locations");
    },
  });

  useEffect(() => {
    if (row && !editing) {
      setForm({ code: row.code, label: row.label, sortOrder: String(row.sortOrder) });
    }
  }, [row, editing]);

  if (!code) {
    return <p className="text-slate-500">Not found</p>;
  }
  if (isLoading || error) {
    if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load"}</p>;
    return <p className="text-slate-500">Loading…</p>;
  }
  if (!row) return <p className="text-slate-500">Location not found</p>;

  const handleDelete = () => {
    if (
      !window.confirm(
        "Delete this location? Anyone assigned to it will have their location cleared (set to empty).",
      )
    ) {
      return;
    }
    del.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{row.label}</h1>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-2 py-1 text-sm border border-red-200 text-red-700 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <form
          className="space-y-3 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            const sortOrder = Number.parseInt(form.sortOrder, 10);
            if (Number.isNaN(sortOrder) || !Number.isInteger(sortOrder)) {
              setFormError("Sort order must be an integer");
              return;
            }
            if (!form.code.trim()) {
              setFormError("Code is required");
              return;
            }
            if (!form.label.trim()) {
              setFormError("Label is required");
              return;
            }
            patch.mutate({
              code: form.code.trim(),
              label: form.label.trim(),
              sortOrder,
            });
          }}
        >
          <div>
            <label htmlFor="loc-edit-code" className="block text-sm font-medium mb-1">
              Code *
            </label>
            <input
              id="loc-edit-code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              required
              className="w-full border rounded px-2 py-1.5 text-sm font-mono"
              autoComplete="off"
            />
            <p className="text-xs text-slate-500 mt-1">
              Renaming updates people assigned to this location (same logical site).
            </p>
          </div>
          <div>
            <label htmlFor="loc-edit-label" className="block text-sm font-medium mb-1">
              Label *
            </label>
            <input
              id="loc-edit-label"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              required
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="loc-edit-sort" className="block text-sm font-medium mb-1">
              Sort order
            </label>
            <input
              id="loc-edit-sort"
              type="number"
              step={1}
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          {patch.isError && (
            <p className="text-red-600 text-sm">
              {patch.error instanceof Error ? patch.error.message : "Save failed"}
            </p>
          )}
          <button
            type="submit"
            disabled={patch.isPending}
            className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50"
          >
            Save
          </button>
        </form>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm max-w-md">
          <dt className="text-slate-500">Code</dt>
          <dd className="font-mono">{row.code}</dd>
          <dt className="text-slate-500">Label</dt>
          <dd>{row.label}</dd>
          <dt className="text-slate-500">Sort order</dt>
          <dd>{row.sortOrder}</dd>
        </dl>
      )}

      {del.isError && (
        <p className="text-red-600 text-sm">{del.error instanceof Error ? del.error.message : "Delete failed"}</p>
      )}

      <p className="text-sm text-slate-500">
        <Link to="/locations" className="text-slate-700 hover:underline">
          ← All locations
        </Link>
      </p>
    </div>
  );
}

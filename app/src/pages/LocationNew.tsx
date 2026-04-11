import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { SiteLocationOption } from "../types";

export function LocationNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: "", label: "", sortOrder: "0" });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const sortOrder = Number.parseInt(form.sortOrder, 10);
      if (Number.isNaN(sortOrder) || !Number.isInteger(sortOrder)) {
        throw new Error("Sort order must be an integer");
      }
      return api.post<SiteLocationOption>("/site-locations", {
        code: form.code.trim(),
        label: form.label.trim(),
        sortOrder,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["site-locations"] });
      navigate(`/locations/${encodeURIComponent(data.code)}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to create"),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Add location</h1>
      <p className="text-sm text-slate-600 mb-4 max-w-md">
        Code is stored on people records; choose something short (e.g. a site abbreviation). You can rename it later on the location detail page.
      </p>
      <form
        className="space-y-3 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.code.trim()) {
            setError("Code is required");
            return;
          }
          if (!form.label.trim()) {
            setError("Label is required");
            return;
          }
          setError(null);
          create.mutate();
        }}
      >
        <div>
          <label htmlFor="loc-new-code" className="block text-sm font-medium mb-1">
            Code *
          </label>
          <input
            id="loc-new-code"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            required
            className="w-full border rounded px-2 py-1.5 text-sm"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="loc-new-label" className="block text-sm font-medium mb-1">
            Label *
          </label>
          <input
            id="loc-new-label"
            value={form.label}
            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            required
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="loc-new-sort" className="block text-sm font-medium mb-1">
            Sort order
          </label>
          <input
            id="loc-new-sort"
            type="number"
            step={1}
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={create.isPending}
          className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50"
        >
          Create
        </button>
      </form>
    </div>
  );
}

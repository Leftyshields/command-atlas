import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";

export function BackupPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState(false);

  const importMutation = useMutation({
    mutationFn: (f: File) => api.importDatabaseBackup(f),
    onSuccess: async () => {
      setImportOk(true);
      setImportError(null);
      setFile(null);
      setConfirmed(false);
      await qc.invalidateQueries({ queryKey: ["observations"] });
      await qc.invalidateQueries({ queryKey: ["people"] });
      await qc.invalidateQueries({ queryKey: ["systems"] });
      await qc.invalidateQueries({ queryKey: ["search"] });
    },
    onError: (e: Error) => {
      setImportOk(false);
      setImportError(e.message);
    },
  });

  async function onExport() {
    setExportError(null);
    try {
      await api.downloadDatabaseBackup();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Database backup</h1>
        <p className="mt-1 text-sm text-slate-600">
          Download a full copy of your SQLite database (people, systems, observations, and links). Import
          replaces <strong>all</strong> application data with the backup file. Export first if you need a
          rollback copy.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-800">Export</h2>
        <p className="text-sm text-slate-600">Save a portable <code className="text-xs bg-slate-100 px-1 rounded">.db</code> file.</p>
        <button
          type="button"
          onClick={() => void onExport()}
          className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700"
        >
          Download backup
        </button>
        {exportError ? <p className="text-sm text-red-600">{exportError}</p> : null}
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-3">
        <h2 className="text-sm font-medium text-amber-950">Import</h2>
        <p className="text-sm text-amber-950/90">
          Restoring drops application tables and reloads them from your backup file. This cannot be undone
          except by importing another backup.
        </p>
        <label className="block text-sm text-slate-700">
          <span className="sr-only">Backup file</span>
          <input
            type="file"
            accept=".db,application/octet-stream,application/x-sqlite3"
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300"
            onChange={(e) => {
              setImportOk(false);
              setImportError(null);
              const f = e.target.files?.[0];
              setFile(f ?? null);
            }}
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-slate-300"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I understand this will replace all current data in the app.</span>
        </label>
        <button
          type="button"
          disabled={!file || !confirmed || importMutation.isPending}
          onClick={() => file && importMutation.mutate(file)}
          className="px-3 py-1.5 bg-amber-900 text-white text-sm rounded hover:bg-amber-950 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importMutation.isPending ? "Importing…" : "Import backup"}
        </button>
        {importError ? <p className="text-sm text-red-700">{importError}</p> : null}
        {importOk ? <p className="text-sm text-green-800">Import finished. Your lists and dashboard now reflect the backup.</p> : null}
      </section>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { OBSERVATION_TYPE_OPTIONS, getObservationTypeOption } from "../../constants/observationTypes";
import { api } from "../../lib/api";
import type { Person, System } from "../../types";

const INITIAL_ADD_PERSON = { name: "", title: "", team: "" };
const INITIAL_ADD_SYSTEM = { name: "", category: "", ownerTeam: "" };

interface FastCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FastCaptureModal({ open, onClose, onSuccess }: FastCaptureModalProps) {
  const qc = useQueryClient();
  const [observation, setObservation] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [context, setContext] = useState("");
  const [linkedPersonIds, setLinkedPersonIds] = useState<string[]>([]);
  const [linkedSystemIds, setLinkedSystemIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [observationType, setObservationType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [addPersonForm, setAddPersonForm] = useState(INITIAL_ADD_PERSON);
  const [addSystemForm, setAddSystemForm] = useState(INITIAL_ADD_SYSTEM);
  const [addPersonError, setAddPersonError] = useState<string | null>(null);
  const [addSystemError, setAddSystemError] = useState<string | null>(null);

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<Person[]>("/people"),
    enabled: open,
  });
  const { data: systems = [] } = useQuery({
    queryKey: ["systems"],
    queryFn: () => api.get<System[]>("/systems"),
    enabled: open,
  });

  const createPerson = useMutation({
    mutationFn: (body: { name: string; title?: string; team?: string }) =>
      api.post<Person>("/people", body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["people"] });
      setLinkedPersonIds((prev) => [...prev, data.id]);
      setShowAddPerson(false);
      setAddPersonForm(INITIAL_ADD_PERSON);
      setAddPersonError(null);
    },
    onError: (err) => setAddPersonError(err instanceof Error ? err.message : "Failed to create"),
  });

  const createSystem = useMutation({
    mutationFn: (body: { name: string; category?: string; ownerTeam?: string }) =>
      api.post<System>("/systems", body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["systems"] });
      setLinkedSystemIds((prev) => [...prev, data.id]);
      setShowAddSystem(false);
      setAddSystemForm(INITIAL_ADD_SYSTEM);
      setAddSystemError(null);
    },
    onError: (err) => setAddSystemError(err instanceof Error ? err.message : "Failed to create"),
  });

  const reset = () => {
    setObservation("");
    setWhyItMatters("");
    setContext("");
    setLinkedPersonIds([]);
    setLinkedSystemIds([]);
    setTitle("");
    setObservationType("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observation.trim()) {
      setError("Observation is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/observations", {
        observation: observation.trim(),
        whyItMatters: whyItMatters.trim() || undefined,
        context: context.trim() || undefined,
        capturedAt: new Date().toISOString(),
        title: title.trim() || undefined,
        observationType: observationType.trim() || undefined,
        linkedPersonIds,
        linkedSystemIds,
      });
      await qc.invalidateQueries({ queryKey: ["observations"] });
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const togglePerson = (id: string) => {
    setLinkedPersonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSystem = (id: string) => {
    setLinkedSystemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openAddPerson = () => {
    setShowAddPerson(true);
    setShowAddSystem(false);
    setAddPersonForm(INITIAL_ADD_PERSON);
    setAddPersonError(null);
  };
  const openAddSystem = () => {
    setShowAddSystem(true);
    setShowAddPerson(false);
    setAddSystemForm(INITIAL_ADD_SYSTEM);
    setAddSystemError(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto m-4 p-4">
        <h2 className="text-lg font-semibold mb-3">Quick capture</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observation type</label>
            <select
              value={observationType}
              onChange={(e) => setObservationType(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="">None</option>
              {OBSERVATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {getObservationTypeOption(observationType || null)?.helperText && (
              <p className="text-slate-500 text-xs mt-1">{getObservationTypeOption(observationType || null)?.helperText}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observation *</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              required
              rows={3}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              placeholder="What did you notice?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Why it matters</label>
            <textarea
              value={whyItMatters}
              onChange={(e) => setWhyItMatters(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Context</label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              placeholder="e.g. 1:1 with James"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Link people</label>
              <button
                type="button"
                onClick={openAddPerson}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                + Add person
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-auto border border-slate-200 rounded p-2">
              {people.length === 0 && !showAddPerson ? (
                <span className="text-slate-500 text-sm">No people yet. Add from People.</span>
              ) : (
                people.map((p) => (
                  <label key={p.id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={linkedPersonIds.includes(p.id)}
                      onChange={() => togglePerson(p.id)}
                    />
                    {p.name}
                  </label>
                ))
              )}
            </div>
            {showAddPerson && (
              <div className="mt-2 p-2 border border-slate-200 rounded bg-slate-50 space-y-2">
                <label className="block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  value={addPersonForm.name}
                  onChange={(e) => setAddPersonForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                  placeholder="Full name"
                />
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  value={addPersonForm.title}
                  onChange={(e) => setAddPersonForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
                <label className="block text-sm font-medium text-slate-700">Team</label>
                <input
                  type="text"
                  value={addPersonForm.team}
                  onChange={(e) => setAddPersonForm((p) => ({ ...p, team: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
                {addPersonError && <p className="text-red-600 text-sm">{addPersonError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const name = addPersonForm.name.trim();
                      if (!name) {
                        setAddPersonError("Name is required.");
                        return;
                      }
                      createPerson.mutate({
                        name,
                        title: addPersonForm.title.trim() || undefined,
                        team: addPersonForm.team.trim() || undefined,
                      });
                    }}
                    disabled={createPerson.isPending}
                    className="px-2 py-1 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
                  >
                    {createPerson.isPending ? "Saving…" : "Save and link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPerson(false);
                      setAddPersonForm(INITIAL_ADD_PERSON);
                      setAddPersonError(null);
                    }}
                    className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Link systems</label>
              <button
                type="button"
                onClick={openAddSystem}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                + Add system
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-auto border border-slate-200 rounded p-2">
              {systems.length === 0 && !showAddSystem ? (
                <span className="text-slate-500 text-sm">No systems yet. Add from Systems.</span>
              ) : (
                systems.map((s) => (
                  <label key={s.id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={linkedSystemIds.includes(s.id)}
                      onChange={() => toggleSystem(s.id)}
                    />
                    {s.name}
                  </label>
                ))
              )}
            </div>
            {showAddSystem && (
              <div className="mt-2 p-2 border border-slate-200 rounded bg-slate-50 space-y-2">
                <label className="block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  value={addSystemForm.name}
                  onChange={(e) => setAddSystemForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                  placeholder="System name"
                />
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <input
                  type="text"
                  value={addSystemForm.category}
                  onChange={(e) => setAddSystemForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
                <label className="block text-sm font-medium text-slate-700">Owner team</label>
                <input
                  type="text"
                  value={addSystemForm.ownerTeam}
                  onChange={(e) => setAddSystemForm((p) => ({ ...p, ownerTeam: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
                {addSystemError && <p className="text-red-600 text-sm">{addSystemError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const name = addSystemForm.name.trim();
                      if (!name) {
                        setAddSystemError("Name is required.");
                        return;
                      }
                      createSystem.mutate({
                        name,
                        category: addSystemForm.category.trim() || undefined,
                        ownerTeam: addSystemForm.ownerTeam.trim() || undefined,
                      });
                    }}
                    disabled={createSystem.isPending}
                    className="px-2 py-1 text-sm bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
                  >
                    {createSystem.isPending ? "Saving…" : "Save and link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSystem(false);
                      setAddSystemForm(INITIAL_ADD_SYSTEM);
                      setAddSystemError(null);
                    }}
                    className="px-2 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-600">More options</summary>
            <div className="mt-2">
              <label className="block font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
          </details>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

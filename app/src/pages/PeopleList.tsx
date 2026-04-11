import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { personLocationLabel } from "../lib/personLocation";
import type { Person } from "../types";

const EMPTY = "__empty__";

type SortKey = "name" | "title" | "team" | "location" | "manager";

function comparePeople(a: Person, b: Person, key: SortKey): number {
  const loc = (p: Person) => personLocationLabel(p);
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "title": {
      const at = (a.title ?? "").trim();
      const bt = (b.title ?? "").trim();
      if (!at && bt) return 1;
      if (at && !bt) return -1;
      return at.localeCompare(bt, undefined, { sensitivity: "base" });
    }
    case "team": {
      const at = (a.team ?? "").trim();
      const bt = (b.team ?? "").trim();
      if (!at && bt) return 1;
      if (at && !bt) return -1;
      return at.localeCompare(bt, undefined, { sensitivity: "base" });
    }
    case "location": {
      const al = loc(a);
      const bl = loc(b);
      const ae = al === "—";
      const be = bl === "—";
      if (ae && !be) return 1;
      if (!ae && be) return -1;
      return al.localeCompare(bl, undefined, { sensitivity: "base" });
    }
    case "manager": {
      const am = (a.manager?.name ?? "").trim();
      const bm = (b.manager?.name ?? "").trim();
      if (!am && bm) return 1;
      if (am && !bm) return -1;
      return am.localeCompare(bm, undefined, { sensitivity: "base" });
    }
    default:
      return 0;
  }
}

function SortChevron({ active, direction }: { active: boolean; direction: "asc" | "desc" | null }) {
  if (!active || !direction) return null;
  const Icon = direction === "asc" ? ChevronUp : ChevronDown;
  return <Icon className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden strokeWidth={2} />;
}

export function PeopleList() {
  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<Person[]>("/people"),
  });

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const [filterName, setFilterName] = useState("");
  const [filterTitle, setFilterTitle] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterManagerId, setFilterManagerId] = useState("");

  const teamOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of list) {
      const t = p.team?.trim();
      if (t) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [list]);

  const locationOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of list) {
      const lab = personLocationLabel(p);
      if (lab !== "—") s.add(lab);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [list]);

  const managerOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of list) {
      if (p.manager) m.set(p.manager.id, p.manager.name);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
  }, [list]);

  const filtered = useMemo(() => {
    const nameQ = filterName.trim().toLowerCase();
    const titleQ = filterTitle.trim().toLowerCase();

    return list.filter((p) => {
      if (nameQ && !p.name.toLowerCase().includes(nameQ)) return false;
      if (titleQ && !(p.title ?? "").toLowerCase().includes(titleQ)) return false;

      if (filterTeam) {
        if (filterTeam === EMPTY) {
          if (p.team?.trim()) return false;
        } else if ((p.team ?? "").trim() !== filterTeam) return false;
      }

      if (filterLocation) {
        const lab = personLocationLabel(p);
        if (filterLocation === EMPTY) {
          if (lab !== "—") return false;
        } else if (lab !== filterLocation) return false;
      }

      if (filterManagerId) {
        if (filterManagerId === EMPTY) {
          if (p.manager) return false;
        } else if (p.manager?.id !== filterManagerId) return false;
      }

      return true;
    });
  }, [list, filterName, filterTitle, filterTeam, filterLocation, filterManagerId]);

  const displayed = useMemo(() => {
    const idOrder = new Map(list.map((p, i) => [p.id, i]));
    const base = [...filtered].sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

    if (!sortKey || !sortDir) return base;

    return [...base].sort((a, b) => {
      const c = comparePeople(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
  }, [filtered, list, sortKey, sortDir]);

  const hasActiveFilters =
    filterName.trim() !== "" ||
    filterTitle.trim() !== "" ||
    filterTeam !== "" ||
    filterLocation !== "" ||
    filterManagerId !== "";

  function clearAllFilters() {
    setFilterName("");
    setFilterTitle("");
    setFilterTeam("");
    setFilterLocation("");
    setFilterManagerId("");
  }

  function cycleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortDir("asc");
    }
  }

  function headerSortState(key: SortKey): { active: boolean; direction: "asc" | "desc" | null } {
    if (sortKey !== key) return { active: false, direction: null };
    return { active: true, direction: sortDir };
  }

  function ariaSortFor(key: SortKey): "ascending" | "descending" | undefined {
    if (sortKey !== key || !sortDir) return undefined;
    return sortDir === "asc" ? "ascending" : "descending";
  }

  function onSortKeyDown(key: SortKey) {
    return (e: KeyboardEvent<HTMLTableCellElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        cycleSort(key);
      }
    };
  }

  const thSort =
    "cursor-pointer select-none hover:bg-slate-100/80 transition-colors text-left p-2 font-medium whitespace-nowrap";

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load"}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">People</h1>
        <Link to="/people/new" className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700">
          Add person
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="text-slate-500">No people yet. Add one to link from observations.</p>
      ) : (
        <div className="bg-white rounded border border-slate-200 overflow-hidden">
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-[0_1px_0_0_rgb(226_232_240)]">
                <tr>
                  <th
                    className={thSort}
                    scope="col"
                    aria-sort={ariaSortFor("name")}
                    tabIndex={0}
                    onClick={() => cycleSort("name")}
                    onKeyDown={onSortKeyDown("name")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Name
                      <SortChevron {...headerSortState("name")} />
                    </span>
                  </th>
                  <th
                    className={thSort}
                    scope="col"
                    aria-sort={ariaSortFor("title")}
                    tabIndex={0}
                    onClick={() => cycleSort("title")}
                    onKeyDown={onSortKeyDown("title")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Title
                      <SortChevron {...headerSortState("title")} />
                    </span>
                  </th>
                  <th
                    className={thSort}
                    scope="col"
                    aria-sort={ariaSortFor("team")}
                    tabIndex={0}
                    onClick={() => cycleSort("team")}
                    onKeyDown={onSortKeyDown("team")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Team
                      <SortChevron {...headerSortState("team")} />
                    </span>
                  </th>
                  <th
                    className={thSort}
                    scope="col"
                    aria-sort={ariaSortFor("location")}
                    tabIndex={0}
                    onClick={() => cycleSort("location")}
                    onKeyDown={onSortKeyDown("location")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Location
                      <SortChevron {...headerSortState("location")} />
                    </span>
                  </th>
                  <th
                    className={thSort}
                    scope="col"
                    aria-sort={ariaSortFor("manager")}
                    tabIndex={0}
                    onClick={() => cycleSort("manager")}
                    onKeyDown={onSortKeyDown("manager")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Manager
                      <SortChevron {...headerSortState("manager")} />
                    </span>
                  </th>
                </tr>
                <tr className="bg-slate-50/95 border-b border-slate-200">
                  <th className="p-1.5 align-middle font-normal" scope="col">
                    <input
                      type="search"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Filter…"
                      className="w-full min-w-[6rem] rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      aria-label="Filter by name"
                    />
                  </th>
                  <th className="p-1.5 align-middle font-normal" scope="col">
                    <input
                      type="search"
                      value={filterTitle}
                      onChange={(e) => setFilterTitle(e.target.value)}
                      placeholder="Filter…"
                      className="w-full min-w-[6rem] rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      aria-label="Filter by title"
                    />
                  </th>
                  <th className="p-1.5 align-middle font-normal" scope="col">
                    <select
                      value={filterTeam}
                      onChange={(e) => setFilterTeam(e.target.value)}
                      className="w-full min-w-[7rem] rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      aria-label="Filter by team"
                    >
                      <option value="">All teams</option>
                      <option value={EMPTY}>(No team)</option>
                      {teamOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="p-1.5 align-middle font-normal" scope="col">
                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full min-w-[7rem] rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      aria-label="Filter by location"
                    >
                      <option value="">All locations</option>
                      <option value={EMPTY}>(No location)</option>
                      {locationOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="p-1.5 align-middle font-normal" scope="col">
                    <select
                      value={filterManagerId}
                      onChange={(e) => setFilterManagerId(e.target.value)}
                      className="w-full min-w-[8rem] rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      aria-label="Filter by manager"
                    >
                      <option value="">All managers</option>
                      <option value={EMPTY}>(No manager)</option>
                      {managerOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No people match the current filters.
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          className="ml-2 text-slate-700 underline hover:text-slate-900"
                          onClick={clearAllFilters}
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  displayed.map((p) => {
                    const titleCell = p.title?.trim();
                    const teamCell = p.team?.trim();
                    const locLabel = personLocationLabel(p);
                    const hasLoc = locLabel !== "—";

                    return (
                      <tr key={p.id} className="border-b border-slate-100 transition-colors hover:bg-zinc-100/80">
                        <td className="p-2">
                          <Link to={`/people/${p.id}`} className="font-medium text-slate-900 hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td className="p-2 text-slate-600">
                          {titleCell ? (
                            titleCell
                          ) : (
                            <span className="block w-full text-center text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-2 text-slate-600">
                          {teamCell ? (
                            teamCell
                          ) : (
                            <span className="block w-full text-center text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-2 text-slate-600">
                          {hasLoc ? (
                            locLabel
                          ) : (
                            <span className="block w-full text-center text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-2 text-slate-600">
                          {p.manager ? (
                            <span className="inline-flex max-w-full items-center gap-1">
                              <button
                                type="button"
                                className="min-w-0 truncate text-left font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-slate-950 hover:decoration-slate-500"
                                onClick={() => setFilterManagerId(p.manager!.id)}
                              >
                                {p.manager.name}
                              </button>
                              <Link
                                to={`/people/${p.manager.id}`}
                                className="inline-flex shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title={`Open ${p.manager.name}`}
                                aria-label={`Open profile: ${p.manager.name}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                              </Link>
                            </span>
                          ) : (
                            <span className="block w-full text-center text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {hasActiveFilters && displayed.length > 0 ? (
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
              <span>
                Showing {displayed.length} of {list.length}
              </span>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-100"
                onClick={clearAllFilters}
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

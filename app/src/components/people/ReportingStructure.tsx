import { PersonNodeCard } from "./PersonNodeCard";
import type { Person } from "../../types";

interface ReportingStructureProps {
  person: Person;
}

export function ReportingStructure({ person }: ReportingStructureProps) {
  const manager = person.manager ?? null;
  const peers = person.peers ?? [];
  const directReports = person.directReports ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-700">Reporting Structure</h3>

      {/* Connector: vertical line from top into manager/current block */}
      <div className="flex flex-col items-center">
        {/* Manager row */}
        <div className="flex flex-col items-center w-full">
          {manager ? (
            <div className="w-full max-w-xs">
              <PersonNodeCard person={manager} variant="manager" />
            </div>
          ) : (
            <p className="text-slate-400 text-sm py-2">No manager recorded</p>
          )}
        </div>

        {/* Vertical connector: manager → current */}
        <div
          className="w-px min-h-[20px] bg-slate-300 flex-shrink-0"
          aria-hidden
        />

        {/* Current person + peers on one horizontal row */}
        <div className="flex flex-wrap justify-center items-start gap-2 w-full max-w-2xl mx-auto">
          <div className="max-w-xs flex-shrink-0">
            <PersonNodeCard
              person={{
                id: person.id,
                name: person.name,
                title: person.title ?? null,
                team: person.team ?? null,
              }}
              variant="current"
              clickable={false}
            />
          </div>
          {peers.length > 0 && (
            <>
              <span className="text-slate-400 text-xs self-center hidden sm:inline">Peers</span>
              {peers.map((p) => (
                <div key={p.id} className="max-w-[180px] min-w-0 flex-shrink-0">
                  <PersonNodeCard person={p} variant="peer" />
                </div>
              ))}
            </>
          )}
        </div>
        {peers.length === 0 && (
          <p className="text-slate-400 text-sm text-center max-w-xs">No peers recorded</p>
        )}

        {/* Vertical connector: from current+peers row down to direct reports */}
        <div
          className="w-px min-h-[20px] bg-slate-300 flex-shrink-0"
          aria-hidden
        />

        {/* Direct reports row: same org-chart column as manager/current (centered under person) */}
        <div className="flex flex-col items-center w-full">
          <div
            className="w-px min-h-[24px] bg-slate-300 flex-shrink-0"
            aria-hidden
          />
          <p className="text-slate-500 text-xs font-medium mb-1.5 w-full max-w-xs text-center">
            Direct reports
          </p>
          {directReports.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2 w-full max-w-xs">
              {directReports.map((r) => (
                <div key={r.id} className="max-w-[180px] min-w-0 flex-shrink-0">
                  <PersonNodeCard person={r} variant="report" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center max-w-xs">No direct reports recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

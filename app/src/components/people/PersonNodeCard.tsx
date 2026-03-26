import { Link } from "react-router-dom";
import type { PersonSummary } from "../../types";

type Variant = "current" | "manager" | "peer" | "report";

const variantStyles: Record<Variant, string> = {
  current: "border-slate-400 shadow-md bg-slate-50",
  manager: "border-slate-300 bg-white",
  peer: "border-slate-200 bg-white",
  report: "border-slate-200 bg-white",
};

interface PersonNodeCardProps {
  person: PersonSummary;
  variant: Variant;
  clickable?: boolean;
}

export function PersonNodeCard({ person, variant, clickable = true }: PersonNodeCardProps) {
  const baseClass =
    "rounded border p-2 text-sm min-w-0 " + variantStyles[variant];
  const content = (
    <>
      <div className="font-medium text-slate-800 truncate">{person.name}</div>
      {person.title && (
        <div className="text-slate-600 truncate">{person.title}</div>
      )}
      {person.team && (
        <div className="text-slate-500 text-xs truncate">{person.team}</div>
      )}
    </>
  );
  if (clickable && variant !== "current") {
    return (
      <Link
        to={`/people/${person.id}`}
        className={`block hover:bg-slate-50 transition-colors ${baseClass}`}
      >
        {content}
      </Link>
    );
  }
  return <div className={baseClass}>{content}</div>;
}

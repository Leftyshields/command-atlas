import { getObservationTypeOption } from "../constants/observationTypes";

interface ObservationTypeBadgeProps {
  observationType: string | null | undefined;
  className?: string;
}

export function ObservationTypeBadge({ observationType, className = "" }: ObservationTypeBadgeProps) {
  const option = getObservationTypeOption(observationType);
  if (!option) return null;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 ${className}`}
      title={option.helperText}
    >
      {option.label}
    </span>
  );
}

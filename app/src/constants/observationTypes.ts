/** Allowed observationType values. Must stay in sync with api/src/routes/observations.ts (OBSERVATION_TYPE_VALUES). */
export const OBSERVATION_TYPES = [
  "structure",
  "ownership",
  "friction",
  "dependency",
  "opportunity",
  "influence",
  "culture",
] as const;

export type ObservationTypeValue = (typeof OBSERVATION_TYPES)[number];

export interface ObservationTypeOption {
  value: ObservationTypeValue;
  label: string;
  helperText: string;
}

export const OBSERVATION_TYPE_OPTIONS: ObservationTypeOption[] = [
  { value: "structure", label: "Structure", helperText: "Capture how teams, roles, or responsibilities are organized in practice." },
  { value: "ownership", label: "Ownership", helperText: "Capture who actually owns a system, decision, or area of responsibility." },
  { value: "friction", label: "Friction", helperText: "Capture something that slows work, creates delays, or adds coordination overhead." },
  { value: "dependency", label: "Dependency", helperText: "Capture how one system, team, or workflow depends on another." },
  { value: "opportunity", label: "Opportunity", helperText: "Capture a place where automation, standardization, or platform work could help." },
  { value: "influence", label: "Influence", helperText: "Capture a person who appears to shape decisions, direction, or execution." },
  { value: "culture", label: "Culture", helperText: "Capture a recurring behavior, attitude, or norm that affects how the organization works." },
];

export function getObservationTypeOption(value: string | null | undefined): ObservationTypeOption | undefined {
  if (!value) return undefined;
  return OBSERVATION_TYPE_OPTIONS.find((o) => o.value === value);
}

/** Allowed toilType values. Must stay in sync with api/src/routes/observations.ts (TOIL_TYPE_VALUES). */

export const TOIL_TYPE_OPTIONS = [
  { value: "Manual Scaling (O(n))", label: "Manual Scaling (O(n))" },
  { value: "Alert Fatigue/Noise", label: "Alert Fatigue/Noise" },
  { value: "Configuration Drift", label: "Configuration Drift" },
  { value: "Manual Deployment/Release", label: "Manual Deployment/Release" },
  { value: "Credential/Access Management", label: "Credential/Access Management" },
  { value: "Incident Firefighting", label: "Incident Firefighting" },
  { value: "Legacy Infrastructure Care", label: "Legacy Infrastructure Care" },
  { value: "Handoff/Ticket Friction", label: "Handoff/Ticket Friction" },
] as const;

export type ToilTypeValue = (typeof TOIL_TYPE_OPTIONS)[number]["value"];

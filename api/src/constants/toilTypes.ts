/** Allowed toilType values. Must stay in sync with app/src/constants/toilTypes.ts (TOIL_TYPE_OPTIONS). */

export const TOIL_TYPE_VALUES = [
  "Manual Scaling (O(n))",
  "Alert Fatigue/Noise",
  "Configuration Drift",
  "Manual Deployment/Release",
  "Credential/Access Management",
  "Incident Firefighting",
  "Legacy Infrastructure Care",
  "Handoff/Ticket Friction",
] as const;

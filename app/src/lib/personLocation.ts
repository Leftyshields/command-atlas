/** Display label from API join (`siteLocation`) or raw code fallback. */
export function personLocationLabel(person: {
  location?: string | null;
  siteLocation?: { code: string; label: string } | null;
}): string {
  if (person.siteLocation?.label) return person.siteLocation.label;
  if (person.location) return person.location;
  return "—";
}

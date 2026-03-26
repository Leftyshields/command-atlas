export interface PersonSummary {
  id: string;
  name: string;
  title?: string | null;
  team?: string | null;
}

export interface Person {
  id: string;
  name: string;
  title?: string | null;
  team?: string | null;
  department?: string | null;
  notes?: string | null;
  managerId?: string | null;
  manager?: PersonSummary | null;
  directReports?: PersonSummary[];
  peers?: PersonSummary[];
  createdAt: string;
  updatedAt: string;
  linkedObservations?: { id: string; title?: string | null; observation: string; capturedAt: string }[];
}

export interface System {
  id: string;
  name: string;
  category?: string | null;
  ownerTeam?: string | null;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  linkedObservations?: { id: string; title?: string | null; observation: string; capturedAt: string }[];
}

export interface Observation {
  id: string;
  title?: string | null;
  observation: string;
  whyItMatters?: string | null;
  context?: string | null;
  observationType?: string | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
  linkedPeople?: { id: string; name: string }[];
  linkedSystems?: { id: string; name: string }[];
}

export interface SearchResults {
  observations: Observation[];
  people: Person[];
  systems: System[];
}

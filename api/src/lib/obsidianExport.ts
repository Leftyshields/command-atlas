import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { personLocationBullet } from "./personLocation.js";
import { prisma } from "./prisma.js";

const OBS_SOURCE = "Observation";
const REF_PERSON = "references_person";
const REF_SYSTEM = "references_system";

type LinkRef = { id: string; name: string };

export interface ObsidianExportSummary {
  vaultRoot: string;
  peopleCount: number;
  systemsCount: number;
  observationsCount: number;
  filesWritten: number;
}
type ExportFile = { relativePath: string; content: string };

function sanitizeForFileName(input: string): string {
  const normalized = input
    .trim()
    .replace(/[\\/:*?"<>|#^]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "");
  return normalized || "Untitled";
}

function toNoteFileName(name: string): string {
  return `${sanitizeForFileName(name)}.md`;
}

function wikiLink(folder: string, name: string): string {
  return `[[${folder}/${sanitizeForFileName(name)}]]`;
}

function toIso(date: Date | string): string {
  return typeof date === "string" ? date : date.toISOString();
}

function mustStayWithin(root: string, child: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedChild = path.resolve(child);
  if (resolvedChild === resolvedRoot || resolvedChild.startsWith(`${resolvedRoot}${path.sep}`)) {
    return resolvedChild;
  }
  throw new Error("Resolved path escapes OBSIDIAN_VAULT_ROOT");
}

function frontmatter(entityType: "person" | "system" | "observation", id: string): string {
  return ["---", `command-atlas-id: ${id}`, `command-atlas-type: ${entityType}`, "---", ""].join("\n");
}

function section(title: string, lines: string[]): string {
  if (!lines.length) return "";
  return [`## ${title}`, ...lines, ""].join("\n");
}

export async function exportToObsidianVault(vaultRootInput: string): Promise<ObsidianExportSummary> {
  const vaultRoot = path.resolve(vaultRootInput);

  const stat = await fs.stat(vaultRoot).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error("OBSIDIAN_VAULT_ROOT does not exist or is not a directory");
  }

  const peopleDir = mustStayWithin(vaultRoot, path.join(vaultRoot, "People"));
  const systemsDir = mustStayWithin(vaultRoot, path.join(vaultRoot, "Systems"));
  const observationsDir = mustStayWithin(vaultRoot, path.join(vaultRoot, "Observations"));

  const { files, peopleCount, systemsCount, observationsCount } = await buildExportFiles();

  // Full regenerate for generated folders.
  await Promise.all([
    fs.rm(peopleDir, { recursive: true, force: true }),
    fs.rm(systemsDir, { recursive: true, force: true }),
    fs.rm(observationsDir, { recursive: true, force: true }),
  ]);
  await Promise.all([fs.mkdir(peopleDir, { recursive: true }), fs.mkdir(systemsDir, { recursive: true }), fs.mkdir(observationsDir, { recursive: true })]);

  for (const file of files) {
    const destination = mustStayWithin(vaultRoot, path.join(vaultRoot, file.relativePath));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.content, "utf8");
  }

  return {
    vaultRoot,
    peopleCount,
    systemsCount,
    observationsCount,
    filesWritten: files.length,
  };
}

export async function exportObsidianZipBuffer(): Promise<{ buffer: Buffer; fileCount: number }> {
  const { files } = await buildExportFiles();
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.relativePath, file.content);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  return { buffer, fileCount: files.length };
}

async function buildExportFiles(): Promise<{
  files: ExportFile[];
  peopleCount: number;
  systemsCount: number;
  observationsCount: number;
}> {
  const [people, systems, observations, rels] = await Promise.all([
    prisma.person.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: { siteLocation: { select: { code: true, label: true } } },
    }),
    prisma.system.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.observation.findMany({ orderBy: [{ capturedAt: "desc" }, { id: "asc" }] }),
    prisma.relationship.findMany({ where: { sourceEntityType: OBS_SOURCE } }),
  ]);

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const systemsById = new Map(systems.map((s) => [s.id, s]));
  const obsLinks = new Map<string, { people: LinkRef[]; systems: LinkRef[] }>();
  for (const rel of rels) {
    const entry = obsLinks.get(rel.sourceEntityId) ?? { people: [], systems: [] };
    if (rel.relationshipType === REF_PERSON) {
      const person = peopleById.get(rel.targetEntityId);
      if (person) entry.people.push({ id: person.id, name: person.name });
    }
    if (rel.relationshipType === REF_SYSTEM) {
      const system = systemsById.get(rel.targetEntityId);
      if (system) entry.systems.push({ id: system.id, name: system.name });
    }
    obsLinks.set(rel.sourceEntityId, entry);
  }

  const files: ExportFile[] = [];

  for (const person of people) {
    const body = [
      frontmatter("person", person.id),
      `# ${person.name}`,
      "",
      person.title ? `- Title: ${person.title}` : "",
      person.team ? `- Team: ${person.team}` : "",
      person.department ? `- Department: ${person.department}` : "",
      personLocationBullet(person.location, person.siteLocation?.label) ?? "",
      "",
      person.notes ? section("Notes", [person.notes]) : "",
    ]
      .filter(Boolean)
      .join("\n");
    files.push({
      relativePath: path.posix.join("People", toNoteFileName(person.name)),
      content: `${body.trim()}\n`,
    });
  }

  for (const system of systems) {
    const body = [
      frontmatter("system", system.id),
      `# ${system.name}`,
      "",
      system.category ? `- Category: ${system.category}` : "",
      system.ownerTeam ? `- Owner team: ${system.ownerTeam}` : "",
      "",
      system.description ? section("Description", [system.description]) : "",
      system.notes ? section("Notes", [system.notes]) : "",
    ]
      .filter(Boolean)
      .join("\n");
    files.push({
      relativePath: path.posix.join("Systems", toNoteFileName(system.name)),
      content: `${body.trim()}\n`,
    });
  }

  for (const obs of observations) {
    const links = obsLinks.get(obs.id) ?? { people: [], systems: [] };
    const peopleLinks = [...links.people]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `- ${wikiLink("People", p.name)}`);
    const systemLinks = [...links.systems]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => `- ${wikiLink("Systems", s.name)}`);
    const body = [
      frontmatter("observation", obs.id),
      `# ${obs.title?.trim() || "Untitled observation"}`,
      "",
      `- Captured: ${toIso(obs.capturedAt)}`,
      obs.observationType ? `- Type: ${obs.observationType}` : "",
      obs.toilType ? `- Toil type: ${obs.toilType}` : "",
      obs.frictionScore != null ? `- Friction score: ${obs.frictionScore}` : "",
      "",
      section("Observation", [obs.observation]),
      obs.whyItMatters ? section("Why It Matters", [obs.whyItMatters]) : "",
      obs.context ? section("Context", [obs.context]) : "",
      section("Linked People", peopleLinks.length ? peopleLinks : ["- None"]),
      section("Linked Systems", systemLinks.length ? systemLinks : ["- None"]),
    ]
      .filter(Boolean)
      .join("\n");
    const obsFileBase = obs.title?.trim() || obs.id;
    files.push({
      relativePath: path.posix.join("Observations", toNoteFileName(obsFileBase)),
      content: `${body.trim()}\n`,
    });
  }

  return { files, peopleCount: people.length, systemsCount: systems.length, observationsCount: observations.length };
}

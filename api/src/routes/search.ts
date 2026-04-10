import { Router } from "express";
import { logError } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

export const searchRouter = Router();

// v1 search: case-insensitive partial match, simple contains, modest dataset.
// SQLite: Prisma "contains" → LIKE '%q%'; SQLite LIKE is case-insensitive for ASCII by default.
// Postgres: use mode: "insensitive" when provider is not SQLite.

const OBS_FIELDS = ["title", "observation", "whyItMatters", "context", "toilType"] as const;
const PERSON_FIELDS = ["name", "title", "team", "department", "notes", "location"] as const;
const SYSTEM_FIELDS = ["name", "category", "ownerTeam", "description", "notes"] as const;

const isSqlite = () => (process.env.DATABASE_URL ?? "").startsWith("file:");

function containsClause(field: string, q: string) {
  return isSqlite()
    ? { [field]: { contains: q } }
    : { [field]: { contains: q, mode: "insensitive" as const } };
}

searchRouter.get("/", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) {
      return res.json({ observations: [], people: [], systems: [] });
    }
    const [observations, people, systems] = await Promise.all([
      prisma.observation.findMany({
        where: {
          OR: OBS_FIELDS.map((f) => containsClause(f, q)),
        },
        orderBy: { capturedAt: "desc" },
        take: 50,
      }),
      prisma.person.findMany({
        where: {
          OR: PERSON_FIELDS.map((f) => containsClause(f, q)),
        },
        orderBy: { name: "asc" },
        take: 50,
        include: { siteLocation: { select: { code: true, label: true } } },
      }),
      prisma.system.findMany({
        where: {
          OR: SYSTEM_FIELDS.map((f) => containsClause(f, q)),
        },
        orderBy: { name: "asc" },
        take: 50,
      }),
    ]);
    res.json({ observations, people, systems });
  } catch (e) {
    logError("Search failed", e);
    res.status(500).json({ error: "Search failed" });
  }
});

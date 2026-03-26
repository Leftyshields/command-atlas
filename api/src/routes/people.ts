import { Router } from "express";
import { logError } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

export const peopleRouter = Router();

async function getLinkedObservations(personId: string) {
  const rels = await prisma.relationship.findMany({
    where: { targetEntityType: "Person", targetEntityId: personId },
  });
  const obsIds = rels.map((r) => r.sourceEntityId).filter((id) => id);
  if (!obsIds.length) return [];
  return prisma.observation.findMany({
    where: { id: { in: obsIds } },
    select: { id: true, title: true, observation: true, capturedAt: true },
    orderBy: { capturedAt: "desc" },
  });
}

peopleRouter.get("/", async (_req, res) => {
  try {
    const list = await prisma.person.findMany({
      orderBy: { name: "asc" },
      take: 500,
      include: { manager: { select: { id: true, name: true, title: true } } },
    });
    res.json(list);
  } catch (e) {
    logError("Failed to list people", e);
    res.status(500).json({ error: "Failed to list people" });
  }
});

peopleRouter.get("/:id", async (req, res) => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: req.params.id },
      include: {
        manager: { select: { id: true, name: true, title: true, team: true } },
        directReports: { select: { id: true, name: true, title: true, team: true } },
      },
    });
    if (!person) return res.status(404).json({ error: "Person not found" });
    let peers: { id: string; name: string; title: string | null; team: string | null }[] = [];
    if (person.managerId) {
      peers = await prisma.person.findMany({
        where: { managerId: person.managerId, id: { not: person.id } },
        select: { id: true, name: true, title: true, team: true },
      });
    }
    const linkedObservations = await getLinkedObservations(person.id);
    res.json({ ...person, peers, linkedObservations });
  } catch (e) {
    logError("Failed to get person", e);
    res.status(500).json({ error: "Failed to get person" });
  }
});

function validateManagerId(managerId: unknown, selfId?: string): { ok: true } | { ok: false; status: number; error: string } {
  if (managerId === undefined || managerId === null || managerId === "") return { ok: true };
  if (typeof managerId !== "string" || !managerId.trim()) return { ok: true };
  const id = managerId.trim();
  if (selfId && id === selfId) return { ok: false, status: 400, error: "Person cannot be their own manager" };
  return { ok: true };
}

peopleRouter.post("/", async (req, res) => {
  try {
    const { name, title, team, department, managerId, notes } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const validation = validateManagerId(managerId);
    if (!validation.ok) return res.status(validation.status).json({ error: validation.error });
    let resolvedManagerId: string | null = null;
    if (managerId !== undefined && managerId !== null && String(managerId).trim() !== "") {
      const existing = await prisma.person.findUnique({ where: { id: String(managerId).trim() } });
      if (!existing) return res.status(400).json({ error: "managerId must reference an existing person" });
      resolvedManagerId = existing.id;
    }
    const person = await prisma.person.create({
      data: {
        name: name.trim(),
        title: title?.trim() ?? null,
        team: team?.trim() ?? null,
        department: department?.trim() ?? null,
        notes: notes?.trim() ?? null,
        managerId: resolvedManagerId,
      },
    });
    res.status(201).json(person);
  } catch (e) {
    logError("Failed to create person", e);
    res.status(500).json({ error: "Failed to create person" });
  }
});

peopleRouter.patch("/:id", async (req, res) => {
  try {
    const existing = await prisma.person.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Person not found" });
    const { name, title, team, department, managerId, notes } = req.body;
    const data: Record<string, unknown> = {};
    if (typeof name === "string") data.name = name.trim();
    if (title !== undefined) data.title = title?.trim() ?? null;
    if (team !== undefined) data.team = team?.trim() ?? null;
    if (department !== undefined) data.department = department?.trim() ?? null;
    if (notes !== undefined) data.notes = notes?.trim() ?? null;
    if (managerId !== undefined) {
      const validation = validateManagerId(managerId, req.params.id);
      if (!validation.ok) return res.status(validation.status).json({ error: validation.error });
      if (managerId === null || managerId === "") {
        data.managerId = null;
      } else if (typeof managerId === "string" && managerId.trim()) {
        const managerExists = await prisma.person.findUnique({ where: { id: managerId.trim() } });
        if (!managerExists) return res.status(400).json({ error: "managerId must reference an existing person" });
        const directCycle = managerExists.managerId === req.params.id;
        if (directCycle) return res.status(400).json({ error: "Setting this manager would create a direct reporting cycle" });
        data.managerId = managerId.trim();
      }
    }
    const person = await prisma.person.update({ where: { id: req.params.id }, data: data as never });
    res.json(person);
  } catch (e) {
    logError("Failed to update person", e);
    res.status(500).json({ error: "Failed to update person" });
  }
});

peopleRouter.delete("/:id", async (req, res) => {
  try {
    const reportsCount = await prisma.person.count({ where: { managerId: req.params.id } });
    if (reportsCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${reportsCount} direct report(s) still reference this manager. Reassign or remove them first.`,
      });
    }
    const obsCount = await prisma.relationship.count({
      where: { targetEntityType: "Person", targetEntityId: req.params.id },
    });
    if (obsCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${obsCount} observation(s) link to this person. Unlink them first.`,
      });
    }
    await prisma.person.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    logError("Failed to delete person", e);
    res.status(500).json({ error: "Failed to delete person" });
  }
});

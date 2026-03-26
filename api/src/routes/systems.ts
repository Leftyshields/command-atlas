import { Router } from "express";
import { logError } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

export const systemsRouter = Router();

async function getLinkedObservations(systemId: string) {
  const rels = await prisma.relationship.findMany({
    where: { targetEntityType: "System", targetEntityId: systemId },
  });
  const obsIds = rels.map((r) => r.sourceEntityId).filter((id) => id);
  if (!obsIds.length) return [];
  return prisma.observation.findMany({
    where: { id: { in: obsIds } },
    select: { id: true, title: true, observation: true, capturedAt: true },
    orderBy: { capturedAt: "desc" },
  });
}

systemsRouter.get("/", async (_req, res) => {
  try {
    const list = await prisma.system.findMany({ orderBy: { name: "asc" }, take: 500 });
    res.json(list);
  } catch (e) {
    logError("Failed to list systems", e);
    res.status(500).json({ error: "Failed to list systems" });
  }
});

systemsRouter.get("/:id", async (req, res) => {
  try {
    const system = await prisma.system.findUnique({ where: { id: req.params.id } });
    if (!system) return res.status(404).json({ error: "System not found" });
    const linkedObservations = await getLinkedObservations(system.id);
    res.json({ ...system, linkedObservations });
  } catch (e) {
    logError("Failed to get system", e);
    res.status(500).json({ error: "Failed to get system" });
  }
});

systemsRouter.post("/", async (req, res) => {
  try {
    const { name, category, ownerTeam, description, notes } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const system = await prisma.system.create({
      data: {
        name: name.trim(),
        category: category?.trim() ?? null,
        ownerTeam: ownerTeam?.trim() ?? null,
        description: description?.trim() ?? null,
        notes: notes?.trim() ?? null,
      },
    });
    res.status(201).json(system);
  } catch (e) {
    logError("Failed to create system", e);
    res.status(500).json({ error: "Failed to create system" });
  }
});

systemsRouter.patch("/:id", async (req, res) => {
  try {
    const existing = await prisma.system.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "System not found" });
    const { name, category, ownerTeam, description, notes } = req.body;
    const data: Record<string, unknown> = {};
    if (typeof name === "string") data.name = name.trim();
    if (category !== undefined) data.category = category?.trim() ?? null;
    if (ownerTeam !== undefined) data.ownerTeam = ownerTeam?.trim() ?? null;
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (notes !== undefined) data.notes = notes?.trim() ?? null;
    const system = await prisma.system.update({ where: { id: req.params.id }, data: data as never });
    res.json(system);
  } catch (e) {
    logError("Failed to update system", e);
    res.status(500).json({ error: "Failed to update system" });
  }
});

systemsRouter.delete("/:id", async (req, res) => {
  try {
    const asTarget = await prisma.relationship.count({
      where: { targetEntityType: "System", targetEntityId: req.params.id },
    });
    const asSource = await prisma.relationship.count({
      where: { sourceEntityType: "System", sourceEntityId: req.params.id },
    });
    const total = asTarget + asSource;
    if (total > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${total} relationship(s) link to this system. Unlink them first.`,
      });
    }
    await prisma.system.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    logError("Failed to delete system", e);
    res.status(500).json({ error: "Failed to delete system" });
  }
});

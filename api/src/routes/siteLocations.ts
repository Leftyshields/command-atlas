import { Router } from "express";
import { logError } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

export const siteLocationsRouter = Router();

siteLocationsRouter.get("/", async (_req, res) => {
  try {
    const rows = await prisma.siteLocation.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { code: true, label: true, sortOrder: true },
    });
    res.json(rows);
  } catch (e) {
    logError("Failed to list site locations", e);
    res.status(500).json({ error: "Failed to list site locations" });
  }
});

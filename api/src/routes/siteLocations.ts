import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Router } from "express";
import { logError } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

/** Reasonable bounds for user-supplied reference data (SQLite TEXT is unbounded). */
const SITE_CODE_MAX = 64;
const SITE_LABEL_MAX = 256;

export const siteLocationsRouter = Router();

function siteFieldErrors(code: string, label: string): string | null {
  if (code.length > SITE_CODE_MAX) return `code must be at most ${SITE_CODE_MAX} characters`;
  if (label.length > SITE_LABEL_MAX) return `label must be at most ${SITE_LABEL_MAX} characters`;
  return null;
}

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

siteLocationsRouter.post("/", async (req, res) => {
  try {
    const { code, label, sortOrder } = req.body;
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "code is required" });
    }
    if (!label || typeof label !== "string" || !label.trim()) {
      return res.status(400).json({ error: "label is required" });
    }
    let order = 0;
    if (sortOrder !== undefined && sortOrder !== null) {
      if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder)) {
        return res.status(400).json({ error: "sortOrder must be an integer" });
      }
      order = sortOrder;
    }
    const c = code.trim();
    const lb = label.trim();
    const fieldErr = siteFieldErrors(c, lb);
    if (fieldErr) return res.status(400).json({ error: fieldErr });
    const row = await prisma.siteLocation.create({
      data: { code: c, label: lb, sortOrder: order },
    });
    res.status(201).json(row);
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "A location with this code already exists" });
    }
    logError("Failed to create site location", e);
    res.status(500).json({ error: "Failed to create site location" });
  }
});

siteLocationsRouter.patch("/:code", async (req, res) => {
  try {
    const paramCode = req.params.code;
    const existing = await prisma.siteLocation.findUnique({ where: { code: paramCode } });
    if (!existing) return res.status(404).json({ error: "Site location not found" });

    const { code: bodyCode, label, sortOrder } = req.body;
    let nextCode = existing.code;
    if (Object.prototype.hasOwnProperty.call(req.body, "code")) {
      if (typeof bodyCode !== "string" || !bodyCode.trim()) {
        return res.status(400).json({ error: "code cannot be empty" });
      }
      nextCode = bodyCode.trim();
    }
    let nextLabel = existing.label;
    if (label !== undefined) {
      if (typeof label !== "string" || !label.trim()) {
        return res.status(400).json({ error: "label cannot be empty" });
      }
      nextLabel = label.trim();
    }
    const fieldErr = siteFieldErrors(nextCode, nextLabel);
    if (fieldErr) return res.status(400).json({ error: fieldErr });

    const data: { code?: string; label?: string; sortOrder?: number } = {};
    if (Object.prototype.hasOwnProperty.call(req.body, "code") && nextCode !== paramCode) {
      data.code = nextCode;
    }
    if (label !== undefined) data.label = nextLabel;
    if (sortOrder !== undefined) {
      if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder)) {
        return res.status(400).json({ error: "sortOrder must be an integer" });
      }
      data.sortOrder = sortOrder;
    }
    if (Object.keys(data).length === 0) {
      return res.json(existing);
    }
    try {
      const row = await prisma.siteLocation.update({ where: { code: paramCode }, data });
      return res.json(row);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        return res.status(409).json({ error: "A location with this code already exists" });
      }
      throw e;
    }
  } catch (e) {
    logError("Failed to update site location", e);
    res.status(500).json({ error: "Failed to update site location" });
  }
});

siteLocationsRouter.delete("/:code", async (req, res) => {
  try {
    const code = req.params.code;
    const existing = await prisma.siteLocation.findUnique({ where: { code } });
    if (!existing) return res.status(404).json({ error: "Site location not found" });
    await prisma.siteLocation.delete({ where: { code } });
    res.status(204).send();
  } catch (e) {
    logError("Failed to delete site location", e);
    res.status(500).json({ error: "Failed to delete site location" });
  }
});

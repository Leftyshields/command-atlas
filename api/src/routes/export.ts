import { Router } from "express";
import { exportObsidianZipBuffer, exportToObsidianVault } from "../lib/obsidianExport.js";
import { logError } from "../lib/logger.js";

export const exportRouter = Router();

/**
 * MVP scope guardrail:
 * - one-way export only (Command Atlas -> Obsidian vault)
 * - manual trigger only
 * - no import/bidirectional sync/scheduling
 */
exportRouter.post("/obsidian", async (_req, res) => {
  const vaultRoot = process.env.OBSIDIAN_VAULT_ROOT?.trim();
  if (!vaultRoot) {
    return res.status(400).json({ error: "OBSIDIAN_VAULT_ROOT is required for Obsidian export" });
  }

  try {
    const summary = await exportToObsidianVault(vaultRoot);
    return res.status(200).json(summary);
  } catch (error) {
    logError("Failed to export Obsidian vault", error);
    const message = error instanceof Error ? error.message : "Failed to export Obsidian vault";
    return res.status(400).json({ error: message });
  }
});

exportRouter.get("/obsidian.zip", async (_req, res) => {
  try {
    const { buffer } = await exportObsidianZipBuffer();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="command-atlas-obsidian-${timestamp}.zip"`);
    res.setHeader("Content-Length", buffer.length.toString());
    return res.status(200).send(buffer);
  } catch (error) {
    logError("Failed to build Obsidian zip export", error);
    const message = error instanceof Error ? error.message : "Failed to build Obsidian zip export";
    return res.status(500).json({ error: message });
  }
});

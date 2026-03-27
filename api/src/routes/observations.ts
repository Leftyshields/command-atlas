import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { TOIL_TYPE_VALUES } from "../constants/toilTypes.js";
import { logError } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

const OBS_TEXT_MAX_LENGTH = 50_000;

/** Allowed observationType values. Must stay in sync with app/src/constants/observationTypes.ts (OBSERVATION_TYPES). */
const OBSERVATION_TYPE_VALUES = [
  "structure",
  "ownership",
  "friction",
  "dependency",
  "opportunity",
  "influence",
  "culture",
] as const;

const observationTypeSchema = z
  .enum(OBSERVATION_TYPE_VALUES)
  .nullish();

const toilTypeSchema = z.enum(TOIL_TYPE_VALUES).nullish();

const frictionScoreSchema = z.number().int().min(1).max(5).nullish();

/** JSON PATCH bodies often send explicit `null` for cleared fields; `z.string().optional()` rejects null. */
const optionalNullableTrimmedString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((s) => {
    if (s === undefined) return undefined;
    if (s === null) return null;
    const t = s.trim();
    return t === "" ? null : t;
  });

const observationCreateSchema = z.object({
  observation: z
    .string({ required_error: "observation is required" })
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "observation is required").max(OBS_TEXT_MAX_LENGTH)),
  title: z.string().optional().transform((s) => (s != null && s !== "" ? s.trim() : undefined)),
  whyItMatters: z.string().optional().transform((s) => (s != null && s !== "" ? s.trim() : undefined)),
  context: z.string().optional().transform((s) => (s != null && s !== "" ? s.trim() : undefined)),
  capturedAt: z.union([z.string(), z.date()]).optional(),
  observationType: observationTypeSchema,
  toilType: toilTypeSchema,
  frictionScore: frictionScoreSchema,
  linkedPersonIds: z.array(z.string()).optional(),
  linkedSystemIds: z.array(z.string()).optional(),
});

const observationPatchSchema = z.object({
  observation: z.string().max(OBS_TEXT_MAX_LENGTH).transform((s) => s.trim()).optional(),
  title: optionalNullableTrimmedString,
  whyItMatters: optionalNullableTrimmedString,
  context: optionalNullableTrimmedString,
  capturedAt: z.union([z.string(), z.date()]).optional(),
  observationType: observationTypeSchema,
  toilType: toilTypeSchema,
  frictionScore: frictionScoreSchema,
  linkedPersonIds: z.array(z.string()).optional(),
  linkedSystemIds: z.array(z.string()).optional(),
});

export const observationsRouter = Router();

const OBS_SOURCE = "Observation";
const REF_PERSON = "references_person";
const REF_SYSTEM = "references_system";

async function getLinkedPeopleAndSystems(observationId: string) {
  const rels = await prisma.relationship.findMany({
    where: { sourceEntityType: OBS_SOURCE, sourceEntityId: observationId },
  });
  const personIds = rels.filter((r) => r.relationshipType === REF_PERSON).map((r) => r.targetEntityId);
  const systemIds = rels.filter((r) => r.relationshipType === REF_SYSTEM).map((r) => r.targetEntityId);
  const [people, systems] = await Promise.all([
    personIds.length ? prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true } }) : [],
    systemIds.length ? prisma.system.findMany({ where: { id: { in: systemIds } }, select: { id: true, name: true } }) : [],
  ]);
  return { linkedPeople: people, linkedSystems: systems };
}

observationsRouter.get("/", async (_req, res) => {
  try {
    const list = await prisma.observation.findMany({
      orderBy: { capturedAt: "desc" },
      take: 500,
    });
    res.json(list);
  } catch (e) {
    logError("Failed to list observations", e);
    res.status(500).json({ error: "Failed to list observations" });
  }
});

observationsRouter.get("/:id", async (req, res) => {
  try {
    const obs = await prisma.observation.findUnique({ where: { id: req.params.id } });
    if (!obs) return res.status(404).json({ error: "Observation not found" });
    const { linkedPeople, linkedSystems } = await getLinkedPeopleAndSystems(obs.id);
    res.json({ ...obs, linkedPeople, linkedSystems });
  } catch (e) {
    logError("Failed to get observation", e);
    res.status(500).json({ error: "Failed to get observation" });
  }
});

observationsRouter.post("/", async (req, res) => {
  try {
    const parsed = observationCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const obsMsg = flat.fieldErrors.observation?.[0];
      const typeMsg = flat.fieldErrors.observationType?.[0];
      const toilMsg = flat.fieldErrors.toilType?.[0];
      const frictionMsg = flat.fieldErrors.frictionScore?.[0];
      const message =
        typeof obsMsg === "string"
          ? (obsMsg.includes("expected string, received undefined") ? "observation is required" : obsMsg)
          : typeof typeMsg === "string"
            ? typeMsg
            : typeof toilMsg === "string"
              ? toilMsg
              : typeof frictionMsg === "string"
                ? frictionMsg
                : (flat.formErrors[0] ?? "Validation failed");
      return res.status(400).json({ error: typeof message === "string" ? message : "Validation failed" });
    }
    const {
      observation,
      title,
      whyItMatters,
      context,
      capturedAt,
      observationType,
      toilType,
      frictionScore,
      linkedPersonIds,
      linkedSystemIds,
    } = parsed.data;
    const createData: Prisma.ObservationCreateInput = {
      observation,
      title: title ?? null,
      whyItMatters: whyItMatters ?? null,
      context: context ?? null,
      observationType: observationType ?? null,
      toilType: toilType ?? null,
      frictionScore: frictionScore ?? null,
    };
    if (capturedAt !== undefined && capturedAt !== null) {
      const d = new Date(capturedAt);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "invalid capturedAt date" });
      }
      createData.capturedAt = d;
    }
    const obs = await prisma.observation.create({ data: createData });
    const pIds = linkedPersonIds ?? [];
    const sIds = linkedSystemIds ?? [];
    if (pIds.length || sIds.length) {
      await prisma.relationship.createMany({
        data: [
          ...pIds.map((targetEntityId: string) => ({
            sourceEntityType: OBS_SOURCE,
            sourceEntityId: obs.id,
            targetEntityType: "Person",
            targetEntityId,
            relationshipType: REF_PERSON,
          })),
          ...sIds.map((targetEntityId: string) => ({
            sourceEntityType: OBS_SOURCE,
            sourceEntityId: obs.id,
            targetEntityType: "System",
            targetEntityId,
            relationshipType: REF_SYSTEM,
          })),
        ],
      });
    }
    const { linkedPeople, linkedSystems } = await getLinkedPeopleAndSystems(obs.id);
    res.status(201).json({ ...obs, linkedPeople, linkedSystems });
  } catch (e) {
    logError("Failed to create observation", e);
    const message =
      process.env.NODE_ENV !== "production" && e instanceof Error ? `Failed to create observation: ${e.message}` : "Failed to create observation";
    res.status(500).json({ error: message });
  }
});

observationsRouter.patch("/:id", async (req, res) => {
  try {
    const existing = await prisma.observation.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Observation not found" });
    const parsed = observationPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const typeMsg = flat.fieldErrors.observationType?.[0];
      const obsMsg = flat.fieldErrors.observation?.[0];
      const toilMsg = flat.fieldErrors.toilType?.[0];
      const frictionMsg = flat.fieldErrors.frictionScore?.[0];
      const message =
        typeof typeMsg === "string"
          ? typeMsg
          : typeof obsMsg === "string"
            ? obsMsg
            : typeof toilMsg === "string"
              ? toilMsg
              : typeof frictionMsg === "string"
                ? frictionMsg
                : (flat.formErrors[0] ?? "Validation failed");
      return res.status(400).json({ error: typeof message === "string" ? message : "Validation failed" });
    }
    const {
      observation,
      title,
      whyItMatters,
      context,
      capturedAt,
      observationType,
      toilType,
      frictionScore,
      linkedPersonIds,
      linkedSystemIds,
    } = parsed.data;
    const data: Prisma.ObservationUpdateInput = {};
    if (observation !== undefined) data.observation = observation;
    if (title !== undefined) data.title = title ?? null;
    if (whyItMatters !== undefined) data.whyItMatters = whyItMatters ?? null;
    if (context !== undefined) data.context = context ?? null;
    if (observationType !== undefined) data.observationType = observationType ?? null;
    if (toilType !== undefined) data.toilType = toilType ?? null;
    if (frictionScore !== undefined) data.frictionScore = frictionScore ?? null;
    if (capturedAt !== undefined) {
      const d = new Date(capturedAt);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "invalid capturedAt date" });
      }
      data.capturedAt = d;
    }
    const obs = await prisma.observation.update({ where: { id: req.params.id }, data });
    // PATCH link semantics: only update relationship set(s) whose key is present. Omit = leave unchanged.
    if (linkedPersonIds !== undefined) {
      await prisma.relationship.deleteMany({
        where: {
          sourceEntityType: OBS_SOURCE,
          sourceEntityId: obs.id,
          relationshipType: REF_PERSON,
        },
      });
      if (linkedPersonIds.length) {
        await prisma.relationship.createMany({
          data: linkedPersonIds.map((targetEntityId: string) => ({
            sourceEntityType: OBS_SOURCE,
            sourceEntityId: obs.id,
            targetEntityType: "Person",
            targetEntityId,
            relationshipType: REF_PERSON,
          })),
        });
      }
    }
    if (linkedSystemIds !== undefined) {
      await prisma.relationship.deleteMany({
        where: {
          sourceEntityType: OBS_SOURCE,
          sourceEntityId: obs.id,
          relationshipType: REF_SYSTEM,
        },
      });
      if (linkedSystemIds.length) {
        await prisma.relationship.createMany({
          data: linkedSystemIds.map((targetEntityId: string) => ({
            sourceEntityType: OBS_SOURCE,
            sourceEntityId: obs.id,
            targetEntityType: "System",
            targetEntityId,
            relationshipType: REF_SYSTEM,
          })),
        });
      }
    }
    const { linkedPeople, linkedSystems } = await getLinkedPeopleAndSystems(obs.id);
    res.json({ ...obs, linkedPeople, linkedSystems });
  } catch (e) {
    logError("Failed to update observation", e);
    res.status(500).json({ error: "Failed to update observation" });
  }
});

observationsRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.observation.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Observation not found" });
    await prisma.relationship.deleteMany({
      where: { sourceEntityType: OBS_SOURCE, sourceEntityId: req.params.id },
    });
    await prisma.observation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    logError("Failed to delete observation", e);
    res.status(500).json({ error: "Failed to delete observation" });
  }
});

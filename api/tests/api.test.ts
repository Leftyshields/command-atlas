import { afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const api = request(app);

beforeAll(() => {
  process.env.DATABASE_URL = "file:./test.db";
});

afterEach(async () => {
  await prisma.relationship.deleteMany({});
  await prisma.observation.deleteMany({});
  await prisma.person.deleteMany({});
  await prisma.system.deleteMany({});
});

describe("Observations", () => {
  it("POST /api/observations - requires observation text", async () => {
    const res = await api.post("/api/observations").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("observation is required");
  });

  it("POST /api/observations - rejects empty string", async () => {
    const res = await api.post("/api/observations").send({ observation: "   " });
    expect(res.status).toBe(400);
  });

  it("POST /api/observations - creates with only observation", async () => {
    const res = await api
      .post("/api/observations")
      .send({ observation: "Test observation" });
    expect(res.status).toBe(201);
    expect(res.body.observation).toBe("Test observation");
    expect(res.body.id).toBeDefined();
    expect(res.body.capturedAt).toBeDefined();
    expect(res.body.linkedPeople).toEqual([]);
    expect(res.body.linkedSystems).toEqual([]);
  });

  it("POST /api/observations - creates with all optional fields", async () => {
    const res = await api.post("/api/observations").send({
      observation: "Full observation",
      title: "A title",
      whyItMatters: "Matters",
      context: "1:1 with James",
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("A title");
    expect(res.body.whyItMatters).toBe("Matters");
    expect(res.body.context).toBe("1:1 with James");
  });

  it("POST /api/observations - rejects over 50k characters", async () => {
    const res = await api
      .post("/api/observations")
      .send({ observation: "x".repeat(50_001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("50000");
  });

  it("GET /api/observations - lists by capturedAt desc", async () => {
    await api.post("/api/observations").send({ observation: "First" });
    await api.post("/api/observations").send({ observation: "Second" });
    const res = await api.get("/api/observations");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].observation).toBe("Second");
    expect(res.body[1].observation).toBe("First");
  });

  it("GET /api/observations/:id - returns 404 for bad id", async () => {
    const res = await api.get("/api/observations/bad-id");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("not found");
  });

  it("GET /api/observations/:id - returns observation with links", async () => {
    const created = await api
      .post("/api/observations")
      .send({ observation: "Linked" });
    const id = created.body.id;
    const res = await api.get(`/api/observations/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.observation).toBe("Linked");
    expect(res.body.linkedPeople).toEqual([]);
    expect(res.body.linkedSystems).toEqual([]);
  });

  it("PATCH /api/observations/:id - updates and returns links", async () => {
    const created = await api
      .post("/api/observations")
      .send({ observation: "Original" });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({
      observation: "Updated",
      title: "New title",
    });
    expect(res.status).toBe(200);
    expect(res.body.observation).toBe("Updated");
    expect(res.body.title).toBe("New title");
  });

  it("PATCH /api/observations/:id - accepts JSON null for title/whyItMatters/context (matches browser JSON.stringify)", async () => {
    const created = await api.post("/api/observations").send({
      observation: "Body",
      title: "T",
      whyItMatters: "W",
      context: "C",
    });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({
      observation: "Body",
      title: null,
      whyItMatters: null,
      context: null,
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBeNull();
    expect(res.body.whyItMatters).toBeNull();
    expect(res.body.context).toBeNull();
  });

  it("PATCH /api/observations/:id - omitting link keys leaves links unchanged", async () => {
    const person = await api.post("/api/people").send({ name: "PATCH Test Person" });
    const sys = await api.post("/api/systems").send({ name: "PATCH Test System" });
    const created = await api.post("/api/observations").send({
      observation: "Original",
      linkedPersonIds: [person.body.id],
      linkedSystemIds: [sys.body.id],
    });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({ title: "Only title" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Only title");
    expect(res.body.linkedPeople.length).toBe(1);
    expect(res.body.linkedSystems.length).toBe(1);
  });

  it("PATCH /api/observations/:id - only linkedPersonIds updates people, leaves systems", async () => {
    const person1 = await api.post("/api/people").send({ name: "Person One" });
    const person2 = await api.post("/api/people").send({ name: "Person Two" });
    const sys = await api.post("/api/systems").send({ name: "System Kept" });
    const created = await api.post("/api/observations").send({
      observation: "With both",
      linkedPersonIds: [person1.body.id],
      linkedSystemIds: [sys.body.id],
    });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({
      linkedPersonIds: [person2.body.id],
    });
    expect(res.status).toBe(200);
    expect(res.body.linkedPeople.map((p: { id: string }) => p.id)).toEqual([person2.body.id]);
    expect(res.body.linkedSystems.length).toBe(1);
    expect(res.body.linkedSystems[0].id).toBe(sys.body.id);
  });

  it("PATCH /api/observations/:id - linkedSystemIds [] clears systems, leaves people", async () => {
    const person = await api.post("/api/people").send({ name: "Person Kept" });
    const sys = await api.post("/api/systems").send({ name: "System Cleared" });
    const created = await api.post("/api/observations").send({
      observation: "Both linked",
      linkedPersonIds: [person.body.id],
      linkedSystemIds: [sys.body.id],
    });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({ linkedSystemIds: [] });
    expect(res.status).toBe(200);
    expect(res.body.linkedPeople.length).toBe(1);
    expect(res.body.linkedSystems).toEqual([]);
  });

  it("POST /api/observations - without capturedAt uses schema default", async () => {
    const res = await api.post("/api/observations").send({ observation: "No capturedAt" });
    expect(res.status).toBe(201);
    expect(res.body.capturedAt).toBeDefined();
    const parsed = new Date(res.body.capturedAt).getTime();
    const now = Date.now();
    expect(Math.abs(now - parsed)).toBeLessThan(5000);
  });

  it("POST /api/observations - rejects invalid capturedAt", async () => {
    const res = await api.post("/api/observations").send({
      observation: "Valid",
      capturedAt: "not-a-date",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("capturedAt");
  });

  it("PATCH /api/observations/:id - rejects invalid capturedAt", async () => {
    const created = await api.post("/api/observations").send({ observation: "Original" });
    const res = await api.patch(`/api/observations/${created.body.id}`).send({ capturedAt: "not-a-date" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("capturedAt");
  });

  it("POST /api/observations - creates with valid observationType", async () => {
    const res = await api.post("/api/observations").send({
      observation: "Typed observation",
      observationType: "friction",
    });
    expect(res.status).toBe(201);
    expect(res.body.observationType).toBe("friction");
    expect(res.body.id).toBeDefined();
  });

  it("POST /api/observations - rejects invalid observationType", async () => {
    const res = await api.post("/api/observations").send({
      observation: "Valid text",
      observationType: "unknown",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it("POST /api/observations - creates with toil tracking fields", async () => {
    const res = await api.post("/api/observations").send({
      observation: "Manual deploy steps",
      toilType: "Manual Deployment/Release",
      frictionScore: 4,
    });
    expect(res.status).toBe(201);
    expect(res.body.toilType).toBe("Manual Deployment/Release");
    expect(res.body.frictionScore).toBe(4);
  });

  it("POST /api/observations - rejects invalid toilType", async () => {
    const res = await api.post("/api/observations").send({
      observation: "Valid",
      toilType: "Not a real type",
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/observations - rejects frictionScore out of range", async () => {
    const res = await api.post("/api/observations").send({
      observation: "Valid",
      frictionScore: 6,
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/observations/:id - clears frictionScore with null", async () => {
    const created = await api.post("/api/observations").send({
      observation: "x",
      frictionScore: 3,
    });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({ frictionScore: null });
    expect(res.status).toBe(200);
    expect(res.body.frictionScore).toBeNull();
  });

  it("PATCH /api/observations/:id - sets observationType", async () => {
    const created = await api.post("/api/observations").send({ observation: "No type" });
    const id = created.body.id;
    expect(created.body.observationType).toBeNull();
    const res = await api.patch(`/api/observations/${id}`).send({ observationType: "opportunity" });
    expect(res.status).toBe(200);
    expect(res.body.observationType).toBe("opportunity");
  });

  it("PATCH /api/observations/:id - observationType null clears type", async () => {
    const created = await api.post("/api/observations").send({
      observation: "With type",
      observationType: "culture",
    });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({ observationType: null });
    expect(res.status).toBe(200);
    expect(res.body.observationType).toBeNull();
  });

  it("PATCH /api/observations/:id - omitting observationType leaves it unchanged", async () => {
    const created = await api.post("/api/observations").send({
      observation: "With type",
      observationType: "dependency",
    });
    const id = created.body.id;
    const res = await api.patch(`/api/observations/${id}`).send({ title: "Only title" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Only title");
    expect(res.body.observationType).toBe("dependency");
  });

  it("PATCH /api/observations/:id - 404 for bad id", async () => {
    const res = await api
      .patch("/api/observations/bad-id")
      .send({ observation: "x" });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/observations/:id - deletes and returns 204", async () => {
    const created = await api
      .post("/api/observations")
      .send({ observation: "To delete" });
    const id = created.body.id;
    const res = await api.delete(`/api/observations/${id}`);
    expect(res.status).toBe(204);
    const get = await api.get(`/api/observations/${id}`);
    expect(get.status).toBe(404);
  });
});

describe("Site locations", () => {
  it("GET /api/site-locations - returns seeded rows", async () => {
    const res = await api.get("/api/site-locations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    for (const row of res.body as { code: string; label: string; sortOrder: number }[]) {
      expect(row).toMatchObject({ code: expect.any(String), label: expect.any(String), sortOrder: expect.any(Number) });
    }
  });

  it("POST /api/site-locations - creates and GET includes row", async () => {
    const code = `T_${Date.now()}`;
    const created = await api.post("/api/site-locations").send({
      code,
      label: "Test Site",
      sortOrder: 42,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ code, label: "Test Site", sortOrder: 42 });
    const list = await api.get("/api/site-locations");
    expect(list.status).toBe(200);
    expect((list.body as { code: string }[]).some((r) => r.code === code)).toBe(true);
  });

  it("POST /api/site-locations - rejects label over max length", async () => {
    const code = `LONG_${Date.now()}`;
    const res = await api.post("/api/site-locations").send({
      code,
      label: "x".repeat(300),
      sortOrder: 0,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("label");
  });

  it("POST /api/site-locations - rejects duplicate code", async () => {
    const code = `DUP_${Date.now()}`;
    const first = await api.post("/api/site-locations").send({ code, label: "One", sortOrder: 0 });
    expect(first.status).toBe(201);
    const second = await api.post("/api/site-locations").send({ code, label: "Two", sortOrder: 1 });
    expect(second.status).toBe(409);
    expect(second.body.error).toBeTruthy();
  });

  it("PATCH /api/site-locations/:code - updates label and sortOrder", async () => {
    const code = `P_${Date.now()}`;
    await api.post("/api/site-locations").send({ code, label: "Before", sortOrder: 0 });
    const patch = await api
      .patch(`/api/site-locations/${encodeURIComponent(code)}`)
      .send({ label: "After", sortOrder: 7 });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({ code, label: "After", sortOrder: 7 });
  });

  it("PATCH /api/site-locations/:code - 404 when missing", async () => {
    const res = await api.patch("/api/site-locations/NONEXISTENT_XYZ_999").send({ label: "x" });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/site-locations/:code - renames code and updates person.location (FK cascade)", async () => {
    const oldC = `RN_${Date.now()}`;
    const newC = `${oldC}_NEW`;
    await api.post("/api/site-locations").send({ code: oldC, label: "Rename me", sortOrder: 0 });
    const person = await api.post("/api/people").send({ name: "On Site", location: oldC });
    expect(person.status).toBe(201);
    const patch = await api
      .patch(`/api/site-locations/${encodeURIComponent(oldC)}`)
      .send({ code: newC, label: "Renamed label", sortOrder: 1 });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({ code: newC, label: "Renamed label", sortOrder: 1 });
    const get = await api.get(`/api/people/${person.body.id}`);
    expect(get.body.location).toBe(newC);
  });

  it("PATCH /api/site-locations/:code - 409 when rename collides with existing code", async () => {
    const a = `PA_${Date.now()}`;
    const b = `PB_${Date.now()}`;
    await api.post("/api/site-locations").send({ code: a, label: "A", sortOrder: 0 });
    await api.post("/api/site-locations").send({ code: b, label: "B", sortOrder: 1 });
    const patch = await api.patch(`/api/site-locations/${encodeURIComponent(b)}`).send({ code: a, label: "B" });
    expect(patch.status).toBe(409);
  });

  it("DELETE /api/site-locations/:code - removes row and clears person location", async () => {
    const code = `DEL_${Date.now()}`;
    await api.post("/api/site-locations").send({ code, label: "To remove", sortOrder: 0 });
    const person = await api.post("/api/people").send({ name: "Has Site", location: code });
    expect(person.status).toBe(201);
    const del = await api.delete(`/api/site-locations/${encodeURIComponent(code)}`);
    expect(del.status).toBe(204);
    const get = await api.get(`/api/people/${person.body.id}`);
    expect(get.status).toBe(200);
    expect(get.body.location).toBeNull();
  });

  it("DELETE /api/site-locations/:code - 404 when missing", async () => {
    const res = await api.delete("/api/site-locations/NONEXISTENT_DEL_999");
    expect(res.status).toBe(404);
  });
});

describe("People", () => {
  it("POST /api/people - requires name", async () => {
    const res = await api.post("/api/people").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("name is required");
  });

  it("POST /api/people - creates with optional fields", async () => {
    const res = await api.post("/api/people").send({
      name: "Jane Doe",
      title: "Engineer",
      team: "Platform",
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Jane Doe");
    expect(res.body.title).toBe("Engineer");
    expect(res.body.team).toBe("Platform");
  });

  it("POST /api/people - creates with valid location", async () => {
    const res = await api.post("/api/people").send({
      name: "Site Person",
      location: "LOC01",
    });
    expect(res.status).toBe(201);
    expect(res.body.location).toBe("LOC01");
  });

  it("POST /api/people - rejects invalid location", async () => {
    const res = await api.post("/api/people").send({
      name: "Bad Loc",
      location: "XX",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("location");
  });

  it("PATCH /api/people/:id - sets and clears location", async () => {
    const created = await api.post("/api/people").send({ name: "Loc Patch" });
    expect(created.status).toBe(201);
    const setLoc = await api.patch(`/api/people/${created.body.id}`).send({ location: "LOC03" });
    expect(setLoc.status).toBe(200);
    expect(setLoc.body.location).toBe("LOC03");
    const cleared = await api.patch(`/api/people/${created.body.id}`).send({ location: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.location).toBeNull();
  });

  it("PATCH /api/people/:id - rejects invalid location", async () => {
    const created = await api.post("/api/people").send({ name: "Loc Bad" });
    const patch = await api.patch(`/api/people/${created.body.id}`).send({ location: "ZZ" });
    expect(patch.status).toBe(400);
  });

  it("GET /api/people/:id - returns location when set", async () => {
    const created = await api.post("/api/people").send({ name: "Has Loc", location: "LOC04" });
    const get = await api.get(`/api/people/${created.body.id}`);
    expect(get.status).toBe(200);
    expect(get.body.location).toBe("LOC04");
  });

  it("GET /api/people/:id - 404 for bad id", async () => {
    const res = await api.get("/api/people/bad-id");
    expect(res.status).toBe(404);
  });

  it("DELETE /api/people - 409 when observations link", async () => {
    const person = await api.post("/api/people").send({ name: "Linked Person" });
    const obs = await api.post("/api/observations").send({
      observation: "Obs",
      linkedPersonIds: [person.body.id],
    });
    expect(obs.status).toBe(201);
    const del = await api.delete(`/api/people/${person.body.id}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toContain("observation");
    expect(del.body.error).toContain("Unlink");
  });

  it("DELETE /api/people - succeeds after unlink", async () => {
    const person = await api.post("/api/people").send({ name: "To unlink" });
    await api.post("/api/observations").send({
      observation: "Obs",
      linkedPersonIds: [person.body.id],
    });
    await api.patch(`/api/observations/${(await api.get("/api/observations")).body[0].id}`).send({
      observation: "Obs",
      linkedPersonIds: [],
    });
    const del = await api.delete(`/api/people/${person.body.id}`);
    expect(del.status).toBe(204);
  });

  it("POST /api/people - accepts managerId and GET returns manager and directReports", async () => {
    const manager = await api.post("/api/people").send({ name: "Manager Person" });
    expect(manager.status).toBe(201);
    const report = await api.post("/api/people").send({
      name: "Report Person",
      managerId: manager.body.id,
    });
    expect(report.status).toBe(201);
    expect(report.body.managerId).toBe(manager.body.id);
    const getReport = await api.get(`/api/people/${report.body.id}`);
    expect(getReport.status).toBe(200);
    expect(getReport.body.manager).toMatchObject({ id: manager.body.id, name: "Manager Person", title: null });
    expect(getReport.body.directReports).toEqual([]);
    expect(getReport.body.peers).toEqual([]);
    const getManager = await api.get(`/api/people/${manager.body.id}`);
    expect(getManager.status).toBe(200);
    expect(getManager.body.directReports).toHaveLength(1);
    expect(getManager.body.directReports[0]).toMatchObject({ id: report.body.id, name: "Report Person" });
  });

  it("GET /api/people/:id - returns peers (same managerId, excluding self)", async () => {
    const manager = await api.post("/api/people").send({ name: "Peer Mgr" });
    const peer1 = await api.post("/api/people").send({ name: "Peer One", managerId: manager.body.id });
    const peer2 = await api.post("/api/people").send({ name: "Peer Two", managerId: manager.body.id });
    const get1 = await api.get(`/api/people/${peer1.body.id}`);
    expect(get1.status).toBe(200);
    expect(get1.body.peers).toHaveLength(1);
    expect(get1.body.peers[0]).toMatchObject({ id: peer2.body.id, name: "Peer Two" });
    const get2 = await api.get(`/api/people/${peer2.body.id}`);
    expect(get2.body.peers).toHaveLength(1);
    expect(get2.body.peers[0]).toMatchObject({ id: peer1.body.id, name: "Peer One" });
    const getMgr = await api.get(`/api/people/${manager.body.id}`);
    expect(getMgr.body.peers).toEqual([]);
  });

  it("PATCH /api/people/:id - rejects self as manager", async () => {
    const person = await api.post("/api/people").send({ name: "Self" });
    expect(person.status).toBe(201);
    const patch = await api.patch(`/api/people/${person.body.id}`).send({ managerId: person.body.id });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toContain("own manager");
  });

  it("PATCH /api/people/:id - accepts and clears managerId", async () => {
    const manager = await api.post("/api/people").send({ name: "Mgr" });
    const report = await api.post("/api/people").send({ name: "Rep", managerId: manager.body.id });
    const clear = await api.patch(`/api/people/${report.body.id}`).send({ managerId: null });
    expect(clear.status).toBe(200);
    expect(clear.body.managerId).toBeNull();
    const get = await api.get(`/api/people/${report.body.id}`);
    expect(get.body.manager).toBeNull();
  });

  it("DELETE /api/people - 409 when person has direct reports", async () => {
    const manager = await api.post("/api/people").send({ name: "Manager" });
    await api.post("/api/people").send({ name: "Report", managerId: manager.body.id });
    const del = await api.delete(`/api/people/${manager.body.id}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toContain("direct report");
    expect(del.body.error).toContain("reference this manager");
  });
});

describe("Systems", () => {
  it("POST /api/systems - requires name", async () => {
    const res = await api.post("/api/systems").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("name is required");
  });

  it("POST /api/systems - creates and GET returns it", async () => {
    const created = await api.post("/api/systems").send({
      name: "Billing",
      category: "Finance",
    });
    expect(created.status).toBe(201);
    const res = await api.get(`/api/systems/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Billing");
    expect(res.body.linkedObservations).toEqual([]);
  });

  it("DELETE /api/systems - 409 when observations link", async () => {
    const sys = await api.post("/api/systems").send({ name: "Linked System" });
    await api.post("/api/observations").send({
      observation: "Obs",
      linkedSystemIds: [sys.body.id],
    });
    const del = await api.delete(`/api/systems/${sys.body.id}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toContain("Unlink");
  });
});

describe("Search", () => {
  it("GET /api/search?q= - returns empty when q length < 2", async () => {
    const res = await api.get("/api/search?q=a");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ observations: [], people: [], systems: [] });
  });

  it("GET /api/search?q=xy - returns empty arrays when no matches", async () => {
    const res = await api.get("/api/search?q=xyznonexistent");
    expect(res.status).toBe(200);
    expect(res.body.observations).toEqual([]);
    expect(res.body.people).toEqual([]);
    expect(res.body.systems).toEqual([]);
  });

  it("GET /api/search?q= - finds observation by text", async () => {
    await api.post("/api/observations").send({
      observation: "Unique searchable phrase here",
    });
    const res = await api.get("/api/search?q=searchable");
    expect(res.status).toBe(200);
    expect(res.body.observations.length).toBeGreaterThanOrEqual(1);
    expect(res.body.observations.some((o: { observation: string }) => o.observation.includes("searchable"))).toBe(true);
  });

  it("GET /api/search?q= - finds person by name", async () => {
    await api.post("/api/people").send({ name: "Alice Searchable" });
    const res = await api.get("/api/search?q=Alice");
    expect(res.status).toBe(200);
    expect(res.body.people.length).toBeGreaterThanOrEqual(1);
    expect(res.body.people.some((p: { name: string }) => p.name.includes("Alice"))).toBe(true);
  });

  it("GET /api/search?q= - finds person by location code substring", async () => {
    await api.post("/api/people").send({ name: "Worker With Loc", location: "LOC03" });
    const res = await api.get("/api/search?q=03");
    expect(res.status).toBe(200);
    expect(res.body.people.some((p: { location?: string | null }) => p.location === "LOC03")).toBe(true);
  });
});

describe("Database backup", () => {
  it("GET /api/backup/download - returns SQLite file", async () => {
    const res = await request(app)
      .get("/api/backup/download")
      .buffer(true)
      .parse((res2, callback) => {
        const chunks: Buffer[] = [];
        res2.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res2.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("attachment;");
    const buf = res.body as Buffer;
    expect(buf.subarray(0, 15).toString("utf8")).toBe("SQLite format 3");
  });

  it("POST /api/backup/import - requires file", async () => {
    const res = await api.post("/api/backup/import").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/backup/import - rejects invalid database file", async () => {
    const res = await request(app)
      .post("/api/backup/import")
      .attach("file", Buffer.from("not a sqlite file"), "bad.db");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("POST /api/backup/import - restores data from prior export", async () => {
    await api.post("/api/observations").send({ observation: "Snapshot A" });
    const dl = await request(app)
      .get("/api/backup/download")
      .buffer(true)
      .parse((res2, callback) => {
        const chunks: Buffer[] = [];
        res2.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res2.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(dl.status).toBe(200);

    await api.post("/api/observations").send({ observation: "Snapshot B" });
    const before = await api.get("/api/observations");
    expect(before.body.length).toBe(2);

    const imp = await request(app)
      .post("/api/backup/import")
      .attach("file", dl.body as Buffer, "restore.db");
    expect(imp.status).toBe(200);

    const after = await api.get("/api/observations");
    expect(after.body.length).toBe(1);
    expect(after.body[0].observation).toBe("Snapshot A");
  });
});

describe("Obsidian export", () => {
  it("POST /api/export/obsidian - requires OBSIDIAN_VAULT_ROOT", async () => {
    const prev = process.env.OBSIDIAN_VAULT_ROOT;
    delete process.env.OBSIDIAN_VAULT_ROOT;
    const res = await api.post("/api/export/obsidian").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("OBSIDIAN_VAULT_ROOT");
    if (prev) process.env.OBSIDIAN_VAULT_ROOT = prev;
  });

  it("POST /api/export/obsidian - returns error for missing directory", async () => {
    process.env.OBSIDIAN_VAULT_ROOT = "/tmp/command-atlas-missing-vault";
    const res = await api.post("/api/export/obsidian").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("does not exist");
  });

  it("POST /api/export/obsidian - writes deterministic markdown export", async () => {
    const vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), "ca-obsidian-"));
    process.env.OBSIDIAN_VAULT_ROOT = vaultDir;

    const person = await api.post("/api/people").send({ name: "Alex Person", title: "Engineer" });
    const system = await api.post("/api/systems").send({ name: "Billing Core", category: "Finance" });
    await api.post("/api/observations").send({
      title: "Ownership gap",
      observation: "No clear owner for billing incidents.",
      linkedPersonIds: [person.body.id],
      linkedSystemIds: [system.body.id],
    });

    const first = await api.post("/api/export/obsidian").send({});
    expect(first.status).toBe(200);
    expect(first.body.peopleCount).toBe(1);
    expect(first.body.systemsCount).toBe(1);
    expect(first.body.observationsCount).toBe(1);
    expect(first.body.filesWritten).toBe(3);

    const obsPath = path.join(vaultDir, "Observations", "Ownership gap.md");
    const obsBody1 = await fs.readFile(obsPath, "utf8");
    expect(obsBody1).toContain("[[People/Alex Person]]");
    expect(obsBody1).toContain("[[Systems/Billing Core]]");

    const second = await api.post("/api/export/obsidian").send({});
    expect(second.status).toBe(200);
    const obsBody2 = await fs.readFile(obsPath, "utf8");
    expect(obsBody2).toBe(obsBody1);

    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it("GET /api/export/obsidian.zip - returns downloadable zip", async () => {
    const person = await api.post("/api/people").send({ name: "Zip Person" });
    const system = await api.post("/api/systems").send({ name: "Zip System" });
    await api.post("/api/observations").send({
      title: "Zip Observation",
      observation: "Zip export should include this note.",
      linkedPersonIds: [person.body.id],
      linkedSystemIds: [system.body.id],
    });

    const res = await request(app)
      .get("/api/export/obsidian.zip")
      .buffer(true)
      .parse((res2, callback) => {
        const chunks: Buffer[] = [];
        res2.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res2.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/zip");
    expect(res.headers["content-disposition"]).toContain("attachment;");
    // ZIP signature: PK
    expect(res.body).toBeInstanceOf(Buffer);
    expect((res.body as Buffer).subarray(0, 2).toString("utf8")).toBe("PK");
  });
});

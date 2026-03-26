import { prisma } from "../src/lib/prisma.js";

async function main() {
  await prisma.relationship.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.person.deleteMany();
  await prisma.system.deleteMany();

  const p1 = await prisma.person.create({ data: { name: "Jane Doe", title: "Eng Lead", team: "Platform" } });
  const p2 = await prisma.person.create({ data: { name: "John Smith", title: "SRE", team: "Infra" } });
  const s1 = await prisma.system.create({ data: { name: "Kubernetes", category: "platform", ownerTeam: "Platform" } });
  const s2 = await prisma.system.create({ data: { name: "PostgreSQL", category: "database", ownerTeam: "Data" } });

  await prisma.observation.create({
    data: {
      observation: "Kubernetes networking depends on firewall approvals from networking team.",
      whyItMatters: "Deployment velocity constrained by cross-org ticket process.",
      context: "1:1 with SRE lead",
      capturedAt: new Date(),
      title: "K8s / firewall dependency",
    },
  }).then(async (obs) => {
    await prisma.relationship.createMany({
      data: [
        { sourceEntityType: "Observation", sourceEntityId: obs.id, targetEntityType: "Person", targetEntityId: p2.id, relationshipType: "references_person" },
        { sourceEntityType: "Observation", sourceEntityId: obs.id, targetEntityType: "System", targetEntityId: s1.id, relationshipType: "references_system" },
      ],
    });
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

import type { PrismaClient } from "@prisma/client";

/** Validate `location` body against `SiteLocation` rows (seeded in DB). */
export async function resolveLocationInput(
  prisma: PrismaClient,
  value: unknown,
): Promise<{ ok: true; value: string | null } | { ok: false; error: string }> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "location must be a string or null" };
  }
  const t = value.trim();
  if (t === "") return { ok: true, value: null };
  const row = await prisma.siteLocation.findUnique({ where: { code: t } });
  if (!row) {
    const codes = await prisma.siteLocation.findMany({
      select: { code: true },
      orderBy: { sortOrder: "asc" },
    });
    const list = codes.map((c) => c.code).join(", ");
    return {
      ok: false,
      error: list ? `location must be one of: ${list}` : "location is not available (no site locations configured)",
    };
  }
  return { ok: true, value: t };
}

/** Markdown bullet for Obsidian person export. */
export function personLocationBullet(code: string | null, label: string | null | undefined): string | null {
  if (!code) return null;
  const l = label?.trim();
  if (l) return `- Location: ${l} (${code})`;
  return `- Location: (${code})`;
}

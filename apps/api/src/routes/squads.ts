import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";

export const squadsRouter = Router();

import { randomInt } from "node:crypto";

function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

// List squads the authenticated user belongs to.
squadsRouter.get(
  "/mine",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const memberships = await prisma.squadMember.findMany({
      where: { userId: me.id },
      include: {
        squad: { select: { id: true, name: true, description: true, createdAt: true } }
      },
      orderBy: { joinedAt: "desc" }
    });

    const squads = memberships.map((m) => ({
      id: m.squad.id,
      name: m.squad.name,
      description: m.squad.description,
      createdAt: m.squad.createdAt,
      role: m.role,
      joinedAt: m.joinedAt
    }));

    res.json({ squads });
  })
);

const createSquadSchema = z.object({
  name: z.string().min(2).max(48),
  description: z.string().max(240).optional()
});

squadsRouter.post(
  "/",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const { name, description } = createSquadSchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    let squad = null as null | Awaited<ReturnType<typeof prisma.squad.create>>;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        squad = await prisma.squad.create({
          data: {
            name,
            description: description ?? null,
            inviteCode: randomInviteCode(),
            createdById: me.id,
            members: {
              create: {
                userId: me.id,
                role: "admin"
              }
            }
          },
          include: { members: { include: { user: true } } }
        });
        break;
      } catch (e: unknown) {
        lastError = e;
      }
    }

    if (!squad) throw lastError;

    res.json({ squad });
  })
);

squadsRouter.get(
  "/:id",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const membership = await prisma.squadMember.findUnique({
      where: { squadId_userId: { squadId, userId: me.id } }
    });
    if (!membership) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      include: {
        members: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { joinedAt: "asc" }
        }
      }
    });
    if (!squad) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    res.json({ squad });
  })
);

squadsRouter.get(
  "/:id/dashboard",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.id);
    const clerkUserId = getClerkUserId(req);

    // Stage 1: resolve the internal userId (needed for membership query)
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId }, select: { id: true } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    // Stage 2: fire all remaining queries in parallel — saves ~3-4 sequential round-trips
    const [squad, members] = await Promise.all([
      prisma.squad.findUnique({ where: { id: squadId }, select: { id: true, name: true, inviteCode: true } }),
      prisma.squadMember.findMany({ where: { squadId }, include: { user: true }, orderBy: { joinedAt: "asc" } })
    ]);

    if (!squad || !members.some((m) => m.userId === me.id)) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const userIds = members.map((m) => m.userId);

    // Stage 3: connections + caches in parallel
    const [connections, caches] = await Promise.all([
      prisma.platformConnection.findMany({ where: { userId: { in: userIds } } }),
      prisma.platformDataCache.findMany({ where: { userId: { in: userIds } } })
    ]);

    const safeConnections = connections.map(c => ({
      id: c.id,
      userId: c.userId,
      platform: c.platform,
      username: c.username,
      verified: c.verified,
      connectedAt: c.connectedAt,
    }));

    res.json({ squadId, squad, members, connections: safeConnections, caches });
  })
);

squadsRouter.delete(
  "/:id",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const membership = await prisma.squadMember.findUnique({
      where: { squadId_userId: { squadId, userId: me.id } }
    });
    if (!membership) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }
    if (membership.role !== "admin") {
      res.status(403).json({ error: "Only squad admins can delete this squad." });
      return;
    }

    await prisma.$transaction([
      prisma.$executeRaw`
        DELETE FROM "problem_completions"
        WHERE "problem_id" IN (
          SELECT "sheet_problems"."id"
          FROM "sheet_problems"
          INNER JOIN "practice_sheets"
            ON "practice_sheets"."id" = "sheet_problems"."sheet_id"
          WHERE "practice_sheets"."squad_id" = ${squadId}
        )
      `,
      prisma.$executeRaw`
        DELETE FROM "sheet_problems"
        WHERE "sheet_id" IN (
          SELECT "id" FROM "practice_sheets" WHERE "squad_id" = ${squadId}
        )
      `,
      prisma.$executeRaw`DELETE FROM "practice_sheets" WHERE "squad_id" = ${squadId}`,
      prisma.$executeRaw`
        DELETE FROM "thread_posts"
        WHERE "thread_id" IN (
          SELECT "id" FROM "contest_threads" WHERE "squad_id" = ${squadId}
        )
      `,
      prisma.$executeRaw`DELETE FROM "contest_threads" WHERE "squad_id" = ${squadId}`,
      prisma.$executeRaw`DELETE FROM "activity_feed" WHERE "squad_id" = ${squadId}`,
      prisma.$executeRaw`DELETE FROM "squad_members" WHERE "squad_id" = ${squadId}`,
      prisma.$executeRaw`DELETE FROM "squads" WHERE "id" = ${squadId}`
    ]);

    res.json({ deleted: true, squadId });
  })
);

squadsRouter.delete(
  "/:id/members/me",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const membership = await prisma.squadMember.findUnique({
      where: { squadId_userId: { squadId, userId: me.id } }
    });
    if (!membership) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    if (membership.role === "admin") {
      const otherAdminCount = await prisma.squadMember.count({
        where: { squadId, role: "admin", userId: { not: me.id } }
      });
      if (otherAdminCount === 0) {
        res.status(400).json({
          error: "You are the only admin. Delete the squad instead, or add another admin first."
        });
        return;
      }
    }

    await prisma.squadMember.delete({
      where: { squadId_userId: { squadId, userId: me.id } }
    });

    res.json({ left: true, squadId });
  })
);

squadsRouter.post(
  "/join/:invite_code",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const inviteCode = String(req.params.invite_code);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const squad = await prisma.squad.findUnique({ where: { inviteCode } });
    if (!squad) {
      res.status(404).json({ error: "Invalid invite code" });
      return;
    }

    await prisma.squadMember.upsert({
      where: { squadId_userId: { squadId: squad.id, userId: me.id } },
      update: {},
      create: { squadId: squad.id, userId: me.id, role: "member" }
    });

    res.json({ squadId: squad.id });
  })
);

squadsRouter.patch(
  "/:id/members/me/nickname",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.id);
    const nicknameSchema = z.object({
      nickname: z.string().max(32).nullable(),
    });
    
    const { nickname } = nicknameSchema.parse(req.body);

    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const membership = await prisma.squadMember.findUnique({
      where: { squadId_userId: { squadId, userId: me.id } }
    });

    if (!membership) {
      res.status(404).json({ error: "Squad not found or you are not a member" });
      return;
    }

    const updated = await prisma.squadMember.update({
      where: { id: membership.id },
      data: { nickname: nickname || null }
    });

    res.json({ member: updated });
  })
);

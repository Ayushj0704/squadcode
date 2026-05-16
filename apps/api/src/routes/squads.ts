import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";

export const squadsRouter = Router();

function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

const createSquadSchema = z.object({
  name: z.string().min(2).max(48),
  description: z.string().max(240).optional()
});

squadsRouter.post(
  "/squads",
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
  "/squads/:id",
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
        members: { include: { user: true }, orderBy: { joinedAt: "asc" } }
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
  "/squads/:id/dashboard",
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
      select: { id: true, name: true, inviteCode: true }
    });

    const members = await prisma.squadMember.findMany({
      where: { squadId },
      include: { user: true },
      orderBy: { joinedAt: "asc" }
    });

    const userIds = members.map((m) => m.userId);
    const connections = await prisma.platformConnection.findMany({
      where: { userId: { in: userIds } }
    });
    const caches = await prisma.platformDataCache.findMany({
      where: { userId: { in: userIds } }
    });

    res.json({ squadId, squad, members, connections, caches });
  })
);

squadsRouter.post(
  "/squads/join/:invite_code",
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

import { Router } from "express";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { prisma } from "../prisma.js";
import { assertSquadMembership } from "../auth/membership.js";

export const feedRouter = Router();

feedRouter.get(
  "/:squad_id",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.squad_id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const membership = await assertSquadMembership({ squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const items = await prisma.activityFeed.findMany({
      where: { squadId },
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    res.json({
      items: items.map((i) => ({
        id: i.id,
        squadId: i.squadId,
        userId: i.userId,
        platform: i.platform,
        activityType: i.activityType,
        description: i.description,
        metadata: i.metadata,
        createdAt: i.createdAt,
        user: i.user
      }))
    });
  })
);


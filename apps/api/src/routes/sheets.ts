import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { prisma } from "../prisma.js";
import { assertSquadMembership } from "../auth/membership.js";

export const sheetsRouter = Router();

sheetsRouter.get(
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

    const sheets = await prisma.practiceSheet.findMany({
      where: { squadId },
      orderBy: { createdAt: "desc" },
      include: {
        problems: {
          include: { completions: true }
        }
      }
    });
    res.json({ sheets });
  })
);

const createSheetSchema = z.object({
  squadId: z.string().uuid(),
  title: z.string().min(2).max(120)
});

sheetsRouter.post(
  "/",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const body = createSheetSchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }
    const membership = await assertSquadMembership({ squadId: body.squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Squad not found" });
      return;
    }

    const sheet = await prisma.practiceSheet.create({
      data: {
        squadId: body.squadId,
        title: body.title,
        createdById: me.id
      }
    });
    res.json({ sheet });
  })
);

const addProblemSchema = z.object({
  problemName: z.string().min(2).max(200),
  platform: z.string().min(2).max(32),
  problemUrl: z.string().url(),
  difficulty: z.enum(["easy", "medium", "hard"])
});

sheetsRouter.post(
  "/:id/problems",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const sheetId = String(req.params.id);
    const body = addProblemSchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const sheet = await prisma.practiceSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }
    const membership = await assertSquadMembership({ squadId: sheet.squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Sheet not found" });
      return;
    }

    const problem = await prisma.sheetProblem.create({
      data: {
        sheetId,
        problemName: body.problemName,
        platform: body.platform,
        problemUrl: body.problemUrl,
        difficulty: body.difficulty,
        addedById: me.id
      }
    });
    res.json({ problem });
  })
);

sheetsRouter.post(
  "/:id/problems/:problem_id/complete",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const problemId = String(req.params.problem_id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) {
      res.status(400).json({ error: "User not synced yet. Call /api/auth/sync first." });
      return;
    }

    const problem = await prisma.sheetProblem.findUnique({
      where: { id: problemId },
      include: { sheet: true }
    });
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }
    const membership = await assertSquadMembership({ squadId: problem.sheet.squadId, userId: me.id });
    if (!membership) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    const completion = await prisma.problemCompletion.upsert({
      where: { problemId_userId: { problemId, userId: me.id } },
      update: { completedAt: new Date() },
      create: { problemId, userId: me.id }
    });
    res.json({ completion });
  })
);

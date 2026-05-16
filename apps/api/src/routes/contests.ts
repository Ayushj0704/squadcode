import { Router } from "express";
import { z } from "zod";
import { requireClerkAuth, getClerkUserId } from "../auth/clerk.js";
import { asyncRoute } from "../http/asyncRoute.js";
import { prisma } from "../prisma.js";
import { assertSquadMembership } from "../auth/membership.js";
import axios from "axios";

export const contestsRouter = Router();

// Helper to seed active contests from Codeforces
async function syncActiveContests() {
  try {
    const res = await axios.get("https://codeforces.com/api/contest.list?gym=false");
    if (res.data.status !== "OK") return;
    const contests = res.data.result.filter((c: any) => c.phase === "CODING" || c.phase === "BEFORE").slice(0, 10);
    
    for (const c of contests) {
      const startTime = new Date(c.startTimeSeconds * 1000);
      const endTime = new Date((c.startTimeSeconds + c.durationSeconds) * 1000);
      
      const contest = await prisma.activeContest.upsert({
        where: { id: `cf-${c.id}` },
        update: {
          contestName: c.name,
          startTime,
          endTime,
        },
        create: {
          id: `cf-${c.id}`,
          platform: "codeforces",
          contestName: c.name,
          contestUrl: `https://codeforces.com/contest/${c.id}`,
          startTime,
          endTime,
        }
      });

      // We might not have problem list for BEFORE contests. 
      // If phase is CODING, we could theoretically fetch them, but for this demo, let's mock problems A-E if they don't exist.
      const indices = ["A", "B", "C", "D", "E"];
      for (const idx of indices) {
        const problemId = `${contest.id}-${idx}`;
        const existing = await prisma.contestProblem.findFirst({
          where: { contestId: contest.id, index: idx }
        });
        if (!existing) {
          await prisma.contestProblem.create({
            data: {
              contestId: contest.id,
              index: idx,
              name: `Problem ${idx}`,
              problemUrl: `https://codeforces.com/contest/${c.id}/problem/${idx}`
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to sync contests", err);
  }
}

contestsRouter.get(
  "/squads/:squad_id/contests",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const squadId = String(req.params.squad_id);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) return res.status(400).json({ error: "User not synced yet." });
    
    const membership = await assertSquadMembership({ squadId, userId: me.id });
    if (!membership) return res.status(404).json({ error: "Squad not found" });

    // Sync on read for simplicity
    await syncActiveContests();

    const contests = await prisma.activeContest.findMany({
      orderBy: { startTime: "asc" }
    });
    res.json({ contests });
  })
);

contestsRouter.get(
  "/squads/:squad_id/contests/:contest_id",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const { squad_id, contest_id } = req.params;
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) return res.status(400).json({ error: "User not synced yet." });
    
    const membership = await assertSquadMembership({ squadId: squad_id, userId: me.id });
    if (!membership) return res.status(404).json({ error: "Squad not found" });

    const contest = await prisma.activeContest.findUnique({
      where: { id: contest_id },
      include: {
        problems: {
          orderBy: { index: "asc" }
        }
      }
    });

    if (!contest) return res.status(404).json({ error: "Contest not found" });
    res.json({ contest });
  })
);

contestsRouter.get(
  "/squads/:squad_id/problems/:problem_id/messages",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const { squad_id, problem_id } = req.params;
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) return res.status(400).json({ error: "User not synced yet." });
    
    const membership = await assertSquadMembership({ squadId: squad_id, userId: me.id });
    if (!membership) return res.status(404).json({ error: "Squad not found" });

    const messages = await prisma.problemDiscussionMessage.findMany({
      where: { squadId: squad_id, problemId: problem_id },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });

    res.json({ messages });
  })
);

const postMessageSchema = z.object({
  content: z.string().min(1),
  imageBase64: z.string().optional()
});

contestsRouter.post(
  "/squads/:squad_id/problems/:problem_id/messages",
  requireClerkAuth,
  asyncRoute(async (req, res) => {
    const { squad_id, problem_id } = req.params;
    const body = postMessageSchema.parse(req.body);
    const clerkUserId = getClerkUserId(req);
    const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!me) return res.status(400).json({ error: "User not synced yet." });
    
    const membership = await assertSquadMembership({ squadId: squad_id, userId: me.id });
    if (!membership) return res.status(404).json({ error: "Squad not found" });

    const message = await prisma.problemDiscussionMessage.create({
      data: {
        squadId: squad_id,
        problemId: problem_id,
        userId: me.id,
        content: body.content,
        imageBase64: body.imageBase64
      },
      include: { user: true }
    });

    res.json({ message });
  })
);

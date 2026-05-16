import { prisma } from "../../prisma.js";
import { broadcastToSquad } from "../../websockets/index.js";

// This would ideally be called periodically by a cron or BullMQ repeat job
export async function pollContestStatus() {
  try {
    // 1. Get active contests
    const now = new Date();
    const activeContests = await prisma.activeContest.findMany({
      where: {
        startTime: { lte: now },
        endTime: { gte: now }
      },
      include: { problems: true }
    });

    if (activeContests.length === 0) return;

    // 2. Mock: Randomly select a squad and simulate someone solving a problem
    // In a real scenario, we would iterate over all PlatformConnections of active users,
    // fetch their recent submissions from Codeforces API, and compare with known problems.
    
    // For demo purposes: Every 30 seconds we pick a random active squad and send a mock notification.
    const squads = await prisma.squad.findMany({ include: { members: { include: { user: true } } } });
    if (squads.length === 0) return;

    const randomSquad = squads[Math.floor(Math.random() * squads.length)];
    const randomContest = activeContests[Math.floor(Math.random() * activeContests.length)];
    if (!randomContest.problems.length) return;
    const randomProblem = randomContest.problems[Math.floor(Math.random() * randomContest.problems.length)];
    
    if (randomSquad.members.length === 0) return;
    const randomMember = randomSquad.members[Math.floor(Math.random() * randomSquad.members.length)];

    broadcastToSquad(randomSquad.id, {
      type: "PROBLEM_SOLVED",
      payload: {
        contestId: randomContest.id,
        problemName: randomProblem.name,
        problemIndex: randomProblem.index,
        username: randomMember.user.username,
        time: new Date()
      }
    });

  } catch (err) {
    console.error("Error polling contest status:", err);
  }
}

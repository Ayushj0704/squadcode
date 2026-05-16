import { prisma } from "../prisma.js";

export async function assertSquadMembership(params: {
  squadId: string;
  userId: string;
}) {
  const membership = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: params.squadId, userId: params.userId } }
  });
  return membership;
}


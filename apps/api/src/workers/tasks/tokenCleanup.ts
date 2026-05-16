import { prisma } from "../../prisma.js";

export async function cleanupExpiredTokens() {
  await prisma.platformConnection.deleteMany({
    where: {
      verified: false,
      tokenExpiresAt: { not: null, lt: new Date() }
    }
  });
}


import { prisma } from "../../prisma.js";

export async function cleanupExpiredTokens() {
  await prisma.platformConnection.updateMany({
    where: {
      tokenExpiresAt: { lt: new Date() },
      verificationToken: { not: null }
    },
    data: {
      verificationToken: null,
      tokenExpiresAt: null,
    }
  });
}


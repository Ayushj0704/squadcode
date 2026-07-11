import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const email = "mayanklakra2006@gmail.com";
  console.log("Finding user by email:", email);
  let existing = await prisma.user.findUnique({ where: { email } });
  console.log("Found:", existing?.id);

  if (!existing) {
    console.log("Creating user...");
    try {
      await prisma.user.create({
        data: {
          clerkId: "fake_clerk_id_" + Date.now(),
          username: "fake_username_" + Date.now(),
          email: email
        }
      });
      console.log("Created successfully!");
    } catch (e: any) {
      console.error("Create failed:", e.message);
    }
  } else {
    console.log("User already exists. Updating...");
    try {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          clerkId: "fake_clerk_id_" + Date.now(),
          email: email
        }
      });
      console.log("Updated successfully!");
    } catch (e: any) {
      console.error("Update failed:", e.message);
    }
  }
}
main().finally(() => prisma.$disconnect());

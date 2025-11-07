import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: "admin@kco.dev", role: "ADMIN" as const, name: "Admin" },
    { email: "analyst@kco.dev", role: "ANALYST" as const, name: "Analyst" },
    { email: "viewer@kco.dev", role: "VIEWER" as const, name: "Viewer" },
  ];

  for (const user of users) {
    const password = await bcrypt.hash("Passw0rd!", 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password },
    });
  }

  console.log("✅ Seeded users successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

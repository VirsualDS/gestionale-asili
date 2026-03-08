import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const name = "Marco Platform";
  const email = "marco.baglivo@virsual.it";
  const password = "Pen3Sc0ppolat0!";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.platformUser.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.platformUser.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: "owner",
        isActive: true,
      },
    });

    console.log("Platform user aggiornato.");
    console.log("Nome:", name);
    console.log("Email:", email);
    console.log("Password:", password);
    return;
  }

  await prisma.platformUser.create({
    data: {
      name,
      email,
      passwordHash,
      role: "owner",
      isActive: true,
    },
  });

  console.log("Platform user creato.");
  console.log("Nome:", name);
  console.log("Email:", email);
  console.log("Password:", password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
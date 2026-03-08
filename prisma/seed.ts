import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const superAdminPassword = await bcrypt.hash("Admin123!", 10);
  const structureAdminPassword = await bcrypt.hash("Asilo123!", 10);

  const superAdmin = await prisma.platformUser.upsert({
    where: { email: "admin@piattaforma.local" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@piattaforma.local",
      passwordHash: superAdminPassword,
      role: "superadmin",
      isActive: true,
    },
  });

  const structure = await prisma.structure.upsert({
    where: { email: "info@asilodemo.it" },
    update: {},
    create: {
      name: "Asilo Demo",
      email: "info@asilodemo.it",
      phone: "3331234567",
      address: "Via Roma 1, Catania",
      accountStatus: "active",
      isActive: true,
    },
  });

  const classRoom = await prisma.classRoom.upsert({
    where: {
      structureId_name: {
        structureId: structure.id,
        name: "Sezione Primavera",
      },
    },
    update: {},
    create: {
      structureId: structure.id,
      name: "Sezione Primavera",
      description: "Classe demo iniziale",
      isActive: true,
    },
  });

  const structureAdmin = await prisma.structureUser.upsert({
    where: { email: "admin@asilodemo.it" },
    update: {},
    create: {
      structureId: structure.id,
      name: "Admin Asilo Demo",
      email: "admin@asilodemo.it",
      passwordHash: structureAdminPassword,
      role: "admin",
      isActive: true,
    },
  });

  console.log("Seed completato.");
  console.log({
    superAdmin: superAdmin.email,
    structure: structure.name,
    structureAdmin: structureAdmin.email,
    classRoom: classRoom.name,
  });
}

main()
  .catch((e) => {
    console.error("Errore seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
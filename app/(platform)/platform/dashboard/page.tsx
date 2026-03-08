import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/auth";

async function getPlatformStats() {
  const [structures, activeStructures, structureUsers, children] = await Promise.all([
    prisma.structure.count(),
    prisma.structure.count({
      where: {
        isActive: true,
      },
    }),
    prisma.structureUser.count(),
    prisma.child.count(),
  ]);

  return {
    structures,
    activeStructures,
    structureUsers,
    children,
  };
}

export default async function PlatformDashboardPage() {
  await requirePlatformSession();
  const stats = await getPlatformStats();

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Platform dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">Controllo piattaforma</h1>
        <p className="mt-2 text-neutral-400">
          Panoramica globale delle strutture registrate sulla piattaforma.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Strutture totali</p>
          <p className="mt-2 text-2xl font-semibold">{stats.structures}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Strutture attive</p>
          <p className="mt-2 text-2xl font-semibold">{stats.activeStructures}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Utenti struttura</p>
          <p className="mt-2 text-2xl font-semibold">{stats.structureUsers}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Bambini registrati</p>
          <p className="mt-2 text-2xl font-semibold">{stats.children}</p>
        </div>
      </section>
    </div>
  );
}
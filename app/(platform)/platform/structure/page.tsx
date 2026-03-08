import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getStructures() {
  return prisma.structure.findMany({
    include: {
      users: {
        orderBy: {
          createdAt: "asc",
        },
      },
      _count: {
        select: {
          classes: true,
          children: true,
          users: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

type StructureListItem = Awaited<ReturnType<typeof getStructures>>[number];

export default async function PlatformStructuresPage() {
  await requirePlatformSession();
  const structures = await getStructures();

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Strutture</p>
        <h1 className="mt-2 text-4xl font-bold">Gestione strutture</h1>
        <p className="mt-2 text-neutral-400">
          Elenco completo delle strutture registrate tramite la piattaforma.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Strutture registrate</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Totale strutture: {structures.length}
          </p>
        </div>

        {structures.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
            Nessuna struttura registrata.
          </div>
        ) : (
          <div className="space-y-4">
            {structures.map((structure: StructureListItem) => {
              const adminUser =
                structure.users.find((user) => user.role === "admin") || structure.users[0];

              return (
                <div
                  key={structure.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{structure.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {structure.email || "Email struttura non presente"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Stato account: {structure.accountStatus} ·{" "}
                        {structure.isActive ? "Attiva" : "Disattivata"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Admin: {adminUser?.name || "—"} · {adminUser?.email || "—"}
                      </p>
                    </div>

                    <div className="text-right text-sm text-neutral-400">
                      <p>Utenti: {structure._count.users}</p>
                      <p>Classi: {structure._count.classes}</p>
                      <p>Bambini: {structure._count.children}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/platform/structures/${structure.id}`}
                      className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                    >
                      Apri dettaglio
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PlatformStructuresPageProps = {
  searchParams?: Promise<{
    q?: string;
    error?: string;
    success?: string;
  }>;
};

async function getStructures(query?: string) {
  const normalizedQuery = query?.trim();

  return prisma.structure.findMany({
    where: normalizedQuery
      ? {
          OR: [
            {
              name: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
          ],
        }
      : undefined,
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
          paymentRequests: true,
          payments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function toggleStructureStatus(formData: FormData) {
  "use server";

  await requirePlatformSession();

  const structureId = String(formData.get("structureId") || "").trim();

  if (!structureId) {
    redirect("/platform/structures?error=invalid-structure");
  }

  const structure = await prisma.structure.findUnique({
    where: {
      id: structureId,
    },
  });

  if (!structure) {
    redirect("/platform/structures?error=not-found");
  }

  await prisma.structure.update({
    where: {
      id: structure.id,
    },
    data: {
      isActive: !structure.isActive,
    },
  });

  redirect("/platform/structures?success=status-updated");
}

async function deleteStructure(formData: FormData) {
  "use server";

  await requirePlatformSession();

  const structureId = String(formData.get("structureId") || "").trim();

  if (!structureId) {
    redirect("/platform/structures?error=invalid-structure");
  }

  const structure = await prisma.structure.findUnique({
    where: {
      id: structureId,
    },
    include: {
      _count: {
        select: {
          users: true,
          classes: true,
          children: true,
          paymentRequests: true,
          payments: true,
        },
      },
    },
  });

  if (!structure) {
    redirect("/platform/structures?error=not-found");
  }

  const hasLinkedData =
    structure._count.users > 0 ||
    structure._count.classes > 0 ||
    structure._count.children > 0 ||
    structure._count.paymentRequests > 0 ||
    structure._count.payments > 0;

  if (hasLinkedData) {
    redirect("/platform/structures?error=linked-data");
  }

  await prisma.structure.delete({
    where: {
      id: structure.id,
    },
  });

  redirect("/platform/structures?success=deleted");
}

type StructureListItem = Awaited<ReturnType<typeof getStructures>>[number];

export default async function PlatformStructuresPage({
  searchParams,
}: PlatformStructuresPageProps) {
  await requirePlatformSession();

  const params = searchParams ? await searchParams : undefined;
  const query = params?.q ?? "";
  const structures = await getStructures(query);

  const errorMessage =
    params?.error === "invalid-structure"
      ? "Struttura non valida."
      : params?.error === "not-found"
      ? "Struttura non trovata."
      : params?.error === "linked-data"
      ? "Non puoi eliminare una struttura che contiene utenti, classi, bambini o dati economici."
      : null;

  const successMessage =
    params?.success === "status-updated"
      ? "Stato struttura aggiornato correttamente."
      : params?.success === "deleted"
      ? "Struttura eliminata correttamente."
      : params?.success === "created"
      ? "Struttura creata correttamente."
      : params?.success === "updated"
      ? "Struttura aggiornata correttamente."
      : null;

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Strutture</p>
          <h1 className="mt-2 text-4xl font-bold">Gestione strutture</h1>
          <p className="mt-2 text-neutral-400">
            Elenco completo delle strutture registrate tramite la piattaforma.
          </p>
        </div>

        <Link
          href="/platform/structures/new"
          className="rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
        >
          Nuova struttura
        </Link>
      </header>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="q" className="mb-2 block text-sm font-medium text-neutral-300">
              Cerca per nome struttura o email
            </label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Es. Asilo Demo o info@asilo.it"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="rounded-xl border border-neutral-700 px-4 py-3 font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Cerca
            </button>

            <Link
              href="/platform/structures"
              className="rounded-xl border border-neutral-700 px-4 py-3 font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Strutture registrate</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Totale risultati: {structures.length}
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
                      <p>Richieste: {structure._count.paymentRequests}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/platform/structures/${structure.id}`}
                      className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                    >
                      Apri dettaglio
                    </Link>

                    <Link
                      href={`/platform/structures/${structure.id}/edit`}
                      className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                    >
                      Modifica
                    </Link>

                    <form action={toggleStructureStatus}>
                      <input type="hidden" name="structureId" value={structure.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                      >
                        {structure.isActive ? "Disattiva" : "Attiva"}
                      </button>
                    </form>

                    <form action={deleteStructure}>
                      <input type="hidden" name="structureId" value={structure.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/70"
                      >
                        Elimina
                      </button>
                    </form>
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
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

function getAccountStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
    case "active":
      return "Attivo";
    case "INACTIVE":
    case "inactive":
      return "Inattivo";
    case "SUSPENDED":
    case "suspended":
      return "Sospeso";
    case "PENDING":
    case "pending":
      return "In attesa";
    case "TRIAL":
    case "trial":
      return "Trial";
    case "CANCELLED":
    case "cancelled":
      return "Cancellato";
    default:
      return status;
  }
}

function getAccountStatusClasses(status: string) {
  switch (status) {
    case "ACTIVE":
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "INACTIVE":
    case "inactive":
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
    case "SUSPENDED":
    case "suspended":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "PENDING":
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "TRIAL":
    case "trial":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "CANCELLED":
    case "cancelled":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }
}

function getPaymentSetupStatusLabel(status: string) {
  switch (status) {
    case "not_configured":
      return "Non configurato";
    case "pending":
      return "In attesa";
    case "enabled":
      return "Abilitato";
    case "blocked":
      return "Bloccato";
    default:
      return status;
  }
}

function getPaymentSetupStatusClasses(status: string) {
  switch (status) {
    case "enabled":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "blocked":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "not_configured":
    default:
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }
}

function getBooleanBadgeClasses(value: boolean) {
  return value
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : "border-red-500/30 bg-red-500/10 text-red-300";
}

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
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="font-medium text-white">{structure.name}</p>
                          <p className="mt-1 text-sm text-neutral-500">
                            {structure.email || "Email struttura non presente"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getAccountStatusClasses(
                              structure.accountStatus
                            )}`}
                          >
                            Account: {getAccountStatusLabel(structure.accountStatus)}
                          </span>

                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getBooleanBadgeClasses(
                              structure.isActive
                            )}`}
                          >
                            {structure.isActive ? "Struttura attiva" : "Struttura disattiva"}
                          </span>

                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getPaymentSetupStatusClasses(
                              structure.paymentSetupStatus
                            )}`}
                          >
                            Pagamenti:{" "}
                            {getPaymentSetupStatusLabel(structure.paymentSetupStatus)}
                          </span>
                        </div>

                        <p className="text-sm text-neutral-500">
                          Admin: {adminUser?.name || "—"} · {adminUser?.email || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm text-neutral-400 sm:grid-cols-4 xl:min-w-[340px]">
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
                        <p className="text-xs text-neutral-500">Utenti</p>
                        <p className="mt-1 font-medium text-white">{structure._count.users}</p>
                      </div>

                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
                        <p className="text-xs text-neutral-500">Classi</p>
                        <p className="mt-1 font-medium text-white">{structure._count.classes}</p>
                      </div>

                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
                        <p className="text-xs text-neutral-500">Bambini</p>
                        <p className="mt-1 font-medium text-white">{structure._count.children}</p>
                      </div>

                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
                        <p className="text-xs text-neutral-500">Richieste</p>
                        <p className="mt-1 font-medium text-white">
                          {structure._count.paymentRequests}
                        </p>
                      </div>
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
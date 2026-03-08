import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ChildrenPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

async function getChildren(structureId: string, query?: string) {
  const normalizedQuery = query?.trim();

  return prisma.child.findMany({
    where: {
      structureId,
      ...(normalizedQuery
        ? {
            OR: [
              {
                firstName: {
                  contains: normalizedQuery,
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: normalizedQuery,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    include: {
      classRoom: true,
      _count: {
        select: {
          guardians: true,
          paymentRequests: true,
          authorizedPickupPeople: true,
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export default async function ChildrenPage({ searchParams }: ChildrenPageProps) {
  const session = await requireSession();
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q ?? "";

  const children = await getChildren(session.structureId, query);

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Bambini</p>
          <h1 className="mt-2 text-4xl font-bold">Gestione bambini</h1>
          <p className="mt-2 text-neutral-400">
            Cerca, consulta e registra i bambini della struttura.
          </p>
        </div>

        <Link
          href="/children/new"
          className="rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
        >
          Nuovo bambino
        </Link>
      </header>

      <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <form className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="q" className="mb-2 block text-sm font-medium text-neutral-300">
              Cerca per nome o cognome
            </label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Es. Marco Rossi"
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
              href="/children"
              className="rounded-xl border border-neutral-700 px-4 py-3 font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Elenco bambini</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Totale risultati: {children.length}
          </p>
        </div>

        {children.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
            Nessun bambino trovato.
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/children/${child.id}`}
                className="block rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-4 transition hover:border-neutral-600"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Classe: {child.classRoom.name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Stato: {child.status}
                    </p>
                  </div>

                  <div className="text-right text-sm text-neutral-400">
                    <p>Tutori: {child._count.guardians}</p>
                    <p>Autorizzati: {child._count.authorizedPickupPeople}</p>
                    <p>Richieste: {child._count.paymentRequests}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
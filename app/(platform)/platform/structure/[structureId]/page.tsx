import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PlatformStructureDetailPageProps = {
  params: Promise<{
    structureId: string;
  }>;
};

async function getStructureDetail(structureId: string) {
  return prisma.structure.findUnique({
    where: {
      id: structureId,
    },
    include: {
      users: {
        orderBy: [{ createdAt: "asc" }],
      },
      classes: {
        orderBy: [{ name: "asc" }],
        include: {
          _count: {
            select: {
              children: true,
            },
          },
        },
      },
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
}

type StructureDetail = NonNullable<Awaited<ReturnType<typeof getStructureDetail>>>;
type StructureUserItem = StructureDetail["users"][number];
type StructureClassItem = StructureDetail["classes"][number];

export default async function PlatformStructureDetailPage({
  params,
}: PlatformStructureDetailPageProps) {
  await requirePlatformSession();
  const { structureId } = await params;

  const structure = await getStructureDetail(structureId);

  if (!structure) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/platform/structures"
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Torna alle strutture
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Dettaglio struttura
        </p>
        <h1 className="mt-2 text-4xl font-bold">{structure.name}</h1>
        <p className="mt-2 text-neutral-400">
          {structure.email || "Email non presente"}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stato account</p>
          <p className="mt-2 text-2xl font-semibold">{structure.accountStatus}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Struttura attiva</p>
          <p className="mt-2 text-2xl font-semibold">
            {structure.isActive ? "Sì" : "No"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Classi</p>
          <p className="mt-2 text-2xl font-semibold">{structure._count.classes}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Bambini</p>
          <p className="mt-2 text-2xl font-semibold">{structure._count.children}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Dati struttura</h2>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-neutral-500">Nome</p>
              <p className="mt-1 text-white">{structure.name}</p>
            </div>

            <div>
              <p className="text-neutral-500">Email</p>
              <p className="mt-1 text-white">{structure.email || "—"}</p>
            </div>

            <div>
              <p className="text-neutral-500">Telefono</p>
              <p className="mt-1 text-white">{structure.phone || "—"}</p>
            </div>

            <div>
              <p className="text-neutral-500">Indirizzo</p>
              <p className="mt-1 text-white">{structure.address || "—"}</p>
            </div>

            <div>
              <p className="text-neutral-500">Creata il</p>
              <p className="mt-1 text-white">
                {new Date(structure.createdAt).toLocaleDateString("it-IT")}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Utenti struttura</h2>

          {structure.users.length === 0 ? (
            <p className="text-neutral-400">Nessun utente associato.</p>
          ) : (
            <div className="space-y-3">
              {structure.users.map((user: StructureUserItem) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                >
                  <p className="font-medium text-white">{user.name || user.email}</p>
                  <p className="mt-1 text-sm text-neutral-400">{user.email}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Ruolo: {user.role} · {user.isActive ? "Attivo" : "Disattivato"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Classi della struttura</h2>

        {structure.classes.length === 0 ? (
          <p className="text-neutral-400">Nessuna classe presente.</p>
        ) : (
          <div className="space-y-3">
            {structure.classes.map((classRoom: StructureClassItem) => (
              <div
                key={classRoom.id}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{classRoom.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {classRoom.description || "Nessuna descrizione"}
                  </p>
                </div>

                <div className="text-right text-sm text-neutral-400">
                  <p>{classRoom.isActive ? "Attiva" : "Disattivata"}</p>
                  <p>Bambini: {classRoom._count.children}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
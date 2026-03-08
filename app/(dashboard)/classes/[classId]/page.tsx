import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getClassDetail(structureId: string, classId: string) {
  return prisma.classRoom.findFirst({
    where: {
      id: classId,
      structureId,
    },
    include: {
      children: {
        orderBy: [
          { lastName: "asc" },
          { firstName: "asc" },
        ],
        include: {
          _count: {
            select: {
              guardians: true,
              paymentRequests: true,
            },
          },
        },
      },
      _count: {
        select: {
          children: true,
        },
      },
    },
  });
}

type ClassDetailPageProps = {
  params: Promise<{
    classId: string;
  }>;
};

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const session = await requireSession();
  const { classId } = await params;

  const classRoom = await getClassDetail(session.structureId, classId);

  if (!classRoom) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/classes"
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Torna alle classi
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Dettaglio classe
        </p>
        <h1 className="mt-2 text-4xl font-bold">{classRoom.name}</h1>
        <p className="mt-2 text-neutral-400">
          {classRoom.description || "Nessuna descrizione disponibile."}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stato</p>
          <p className="mt-2 text-2xl font-semibold">
            {classRoom.isActive ? "Attiva" : "Disattivata"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Totale bambini</p>
          <p className="mt-2 text-2xl font-semibold">{classRoom._count.children}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">ID classe</p>
          <p className="mt-2 break-all text-sm text-neutral-300">{classRoom.id}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Bambini della classe</h2>
            <p className="mt-2 text-sm text-neutral-400">
              In questa fase mostriamo l’elenco collegato al database.
            </p>
          </div>
        </div>

        {classRoom.children.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
            Nessun bambino presente in questa classe.
          </div>
        ) : (
          <div className="space-y-3">
            {classRoom.children.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Stato: {child.status}
                    </p>
                  </div>

                  <div className="text-right text-sm text-neutral-400">
                    <p>Tutori: {child._count.guardians}</p>
                    <p>Richieste: {child._count.paymentRequests}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
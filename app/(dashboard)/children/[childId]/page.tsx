import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ChildDetailPageProps = {
  params: Promise<{
    childId: string;
  }>;
  searchParams?: Promise<{
    success?: string;
  }>;
};

async function getChildDetail(structureId: string, childId: string) {
  return prisma.child.findFirst({
    where: {
      id: childId,
      structureId,
    },
    include: {
      classRoom: true,
      guardians: {
        orderBy: [{ isPrimaryContact: "desc" }, { firstName: "asc" }],
      },
      authorizedPickupPeople: {
        orderBy: [{ firstName: "asc" }],
      },
      paymentRequests: {
        orderBy: [{ createdAt: "desc" }],
        take: 10,
      },
    },
  });
}

export default async function ChildDetailPage({
  params,
  searchParams,
}: ChildDetailPageProps) {
  const session = await requireSession();
  const { childId } = await params;
  const qs = searchParams ? await searchParams : undefined;

  const child = await getChildDetail(session.structureId, childId);

  if (!child) {
    notFound();
  }

  const successMessage =
    qs?.success === "created" ? "Bambino creato correttamente." : null;

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/children"
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Torna ai bambini
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Scheda bambino
        </p>
        <h1 className="mt-2 text-4xl font-bold">
          {child.firstName} {child.lastName}
        </h1>
        <p className="mt-2 text-neutral-400">
          Classe: {child.classRoom.name}
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stato</p>
          <p className="mt-2 text-2xl font-semibold">{child.status}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Retta mensile</p>
          <p className="mt-2 text-2xl font-semibold">
            {child.monthlyFee ? `${child.monthlyFee.toString()} €` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Tutori</p>
          <p className="mt-2 text-2xl font-semibold">{child.guardians.length}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Autorizzati</p>
          <p className="mt-2 text-2xl font-semibold">
            {child.authorizedPickupPeople.length}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Dati principali</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-neutral-500">Nome</p>
              <p className="mt-1 text-white">{child.firstName}</p>
            </div>

            <div>
              <p className="text-sm text-neutral-500">Cognome</p>
              <p className="mt-1 text-white">{child.lastName}</p>
            </div>

            <div>
              <p className="text-sm text-neutral-500">Data di nascita</p>
              <p className="mt-1 text-white">
                {child.birthDate ? new Date(child.birthDate).toLocaleDateString("it-IT") : "—"}
              </p>
            </div>

            <div>
              <p className="text-sm text-neutral-500">Orario frequentato</p>
              <p className="mt-1 text-white">{child.attendanceSchedule || "—"}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-neutral-500">Residenza</p>
              <p className="mt-1 text-white">{child.residence || "—"}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-neutral-500">Allergie / intolleranze</p>
              <p className="mt-1 whitespace-pre-wrap text-white">
                {child.allergiesNotes || "—"}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-neutral-500">Note generali</p>
              <p className="mt-1 whitespace-pre-wrap text-white">
                {child.generalNotes || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Tutori</h2>

            {child.guardians.length === 0 ? (
              <p className="text-neutral-400">Nessun tutore registrato.</p>
            ) : (
              <div className="space-y-3">
                {child.guardians.map((guardian) => (
                  <div
                    key={guardian.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                  >
                    <p className="font-medium text-white">
                      {guardian.firstName} {guardian.lastName || ""}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {guardian.relationship || "Relazione non specificata"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-400">
                      {guardian.phone || "Telefono non presente"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-400">
                      {guardian.email || "Email non presente"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Autorizzati al ritiro</h2>

            {child.authorizedPickupPeople.length === 0 ? (
              <p className="text-neutral-400">Nessuna persona autorizzata registrata.</p>
            ) : (
              <div className="space-y-3">
                {child.authorizedPickupPeople.map((person) => (
                  <div
                    key={person.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                  >
                    <p className="font-medium text-white">
                      {person.firstName} {person.lastName || ""}
                    </p>
                    <p className="mt-1 text-sm text-neutral-400">
                      {person.phone || "Telefono non presente"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {person.note || "Nessuna nota"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Ultime richieste di pagamento</h2>

        {child.paymentRequests.length === 0 ? (
          <p className="text-neutral-400">Nessuna richiesta presente.</p>
        ) : (
          <div className="space-y-3">
            {child.paymentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{request.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Tipo: {request.type} · Stato: {request.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{request.amount.toString()} €</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {new Date(request.createdAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
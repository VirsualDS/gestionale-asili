// build fix marker
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AuthorizedPickupPerson, Guardian, PaymentRequest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ChildDetailPageProps = {
  params: Promise<{
    childId: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
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

async function addGuardian(formData: FormData) {
  "use server";

  const session = await requireSession();

  const childId = String(formData.get("childId") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const relationship = String(formData.get("relationship") || "").trim();
  const isPrimaryContact = formData.get("isPrimaryContact") === "on";

  if (!childId || !firstName) {
    redirect(`/children/${childId}?error=guardian-missing`);
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId: session.structureId,
    },
  });

  if (!child) {
    redirect("/children?error=child-not-found");
  }

  if (isPrimaryContact) {
    await prisma.guardian.updateMany({
      where: {
        childId,
      },
      data: {
        isPrimaryContact: false,
      },
    });
  }

  await prisma.guardian.create({
    data: {
      structureId: session.structureId,
      childId,
      firstName,
      lastName: lastName || null,
      phone: phone || null,
      email: email || null,
      relationship: relationship || null,
      isPrimaryContact,
    },
  });

  redirect(`/children/${childId}?success=guardian-created`);
}

async function addAuthorizedPickupPerson(formData: FormData) {
  "use server";

  const session = await requireSession();

  const childId = String(formData.get("childId") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!childId || !firstName) {
    redirect(`/children/${childId}?error=pickup-missing`);
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId: session.structureId,
    },
  });

  if (!child) {
    redirect("/children?error=child-not-found");
  }

  await prisma.authorizedPickupPerson.create({
    data: {
      childId,
      firstName,
      lastName: lastName || null,
      phone: phone || null,
      note: note || null,
    },
  });

  redirect(`/children/${childId}?success=pickup-created`);
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

  let successMessage: string | null = null;
  let errorMessage: string | null = null;

  if (qs?.success === "created") {
    successMessage = "Bambino creato correttamente.";
  } else if (qs?.success === "guardian-created") {
    successMessage = "Tutore aggiunto correttamente.";
  } else if (qs?.success === "pickup-created") {
    successMessage = "Persona autorizzata aggiunta correttamente.";
  }

  if (qs?.error === "guardian-missing") {
    errorMessage = "Per aggiungere un tutore serve almeno il nome.";
  } else if (qs?.error === "pickup-missing") {
    errorMessage = "Per aggiungere una persona autorizzata serve almeno il nome.";
  }

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
        <p className="mt-2 text-neutral-400">Classe: {child.classRoom.name}</p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {errorMessage}
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

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
            <h2 className="mb-4 text-xl font-semibold">Aggiungi tutore</h2>

            <form action={addGuardian} className="space-y-4">
              <input type="hidden" name="childId" value={child.id} />

              <div>
                <label
                  htmlFor="guardian-firstName"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Nome
                </label>
                <input
                  id="guardian-firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="guardian-lastName"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Cognome
                </label>
                <input
                  id="guardian-lastName"
                  name="lastName"
                  type="text"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="guardian-phone"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Telefono
                </label>
                <input
                  id="guardian-phone"
                  name="phone"
                  type="text"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="guardian-email"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Email
                </label>
                <input
                  id="guardian-email"
                  name="email"
                  type="email"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="guardian-relationship"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Relazione
                </label>
                <input
                  id="guardian-relationship"
                  name="relationship"
                  type="text"
                  placeholder="Es. madre, padre, tutore"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  name="isPrimaryContact"
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
                />
                Imposta come contatto principale
              </label>

              <button
                type="submit"
                className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
              >
                Salva tutore
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Aggiungi autorizzato al ritiro</h2>

            <form action={addAuthorizedPickupPerson} className="space-y-4">
              <input type="hidden" name="childId" value={child.id} />

              <div>
                <label
                  htmlFor="pickup-firstName"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Nome
                </label>
                <input
                  id="pickup-firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="pickup-lastName"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Cognome
                </label>
                <input
                  id="pickup-lastName"
                  name="lastName"
                  type="text"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="pickup-phone"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Telefono
                </label>
                <input
                  id="pickup-phone"
                  name="phone"
                  type="text"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label
                  htmlFor="pickup-note"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Nota
                </label>
                <textarea
                  id="pickup-note"
                  name="note"
                  rows={3}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl border border-neutral-700 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-800"
              >
                Salva autorizzato
              </button>
            </form>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Tutori registrati</h2>

          {child.guardians.length === 0 ? (
            <p className="text-neutral-400">Nessun tutore registrato.</p>
          ) : (
            <div className="space-y-3">
              {child.guardians.map((guardian: Guardian) => (
                <div
                  key={guardian.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
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

                    {guardian.isPrimaryContact && (
                      <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-300">
                        Principale
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Autorizzati al ritiro</h2>

          {child.authorizedPickupPeople.length === 0 ? (
            <p className="text-neutral-400">Nessuna persona autorizzata registrata.</p>
          ) : (
            <div className="space-y-3">
              {child.authorizedPickupPeople.map((person: AuthorizedPickupPerson) => (
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
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Ultime richieste di pagamento</h2>

        {child.paymentRequests.length === 0 ? (
          <p className="text-neutral-400">Nessuna richiesta presente.</p>
        ) : (
          <div className="space-y-3">
            {child.paymentRequests.map((request: PaymentRequest) => (
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
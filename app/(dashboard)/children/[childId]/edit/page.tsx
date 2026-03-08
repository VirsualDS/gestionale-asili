import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStructureSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type EditChildPageProps = {
  params: Promise<{
    childId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function getClasses(structureId: string) {
  return prisma.classRoom.findMany({
    where: {
      structureId,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function getChild(structureId: string, childId: string) {
  return prisma.child.findFirst({
    where: {
      id: childId,
      structureId,
    },
    include: {
      classRoom: true,
    },
  });
}

async function updateChild(formData: FormData) {
  "use server";

  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const classRoomId = String(formData.get("classRoomId") || "").trim();
  const residence = String(formData.get("residence") || "").trim();
  const attendanceSchedule = String(formData.get("attendanceSchedule") || "").trim();
  const allergiesNotes = String(formData.get("allergiesNotes") || "").trim();
  const generalNotes = String(formData.get("generalNotes") || "").trim();
  const status = String(formData.get("status") || "active").trim();
  const monthlyFeeRaw = String(formData.get("monthlyFee") || "").trim();
  const birthDateRaw = String(formData.get("birthDate") || "").trim();

  if (!childId || !firstName || !lastName || !classRoomId) {
    redirect(`/children/${childId}/edit?error=missing-fields`);
  }

  const existingChild = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId: session.structureId,
    },
  });

  if (!existingChild) {
    redirect("/children?error=not-found");
  }

  const classRoom = await prisma.classRoom.findFirst({
    where: {
      id: classRoomId,
      structureId: session.structureId,
      isActive: true,
    },
  });

  if (!classRoom) {
    redirect(`/children/${childId}/edit?error=invalid-class`);
  }

  await prisma.child.update({
    where: {
      id: childId,
    },
    data: {
      firstName,
      lastName,
      classRoomId,
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
      residence: residence || null,
      monthlyFee: monthlyFeeRaw ? monthlyFeeRaw : null,
      attendanceSchedule: attendanceSchedule || null,
      allergiesNotes: allergiesNotes || null,
      generalNotes: generalNotes || null,
      status: status || "active",
    },
  });

  redirect(`/children/${childId}?success=updated`);
}

type ClassRoomOption = Awaited<ReturnType<typeof getClasses>>[number];

export default async function EditChildPage({
  params,
  searchParams,
}: EditChildPageProps) {
  const session = await requireStructureSession();
  const { childId } = await params;
  const qs = searchParams ? await searchParams : undefined;

  const [child, classes] = await Promise.all([
    getChild(session.structureId, childId),
    getClasses(session.structureId),
  ]);

  if (!child) {
    notFound();
  }

  const errorMessage =
    qs?.error === "missing-fields"
      ? "Nome, cognome e classe sono obbligatori."
      : qs?.error === "invalid-class"
      ? "La classe selezionata non è valida o non è attiva."
      : null;

  const birthDateValue = child.birthDate
    ? new Date(child.birthDate).toISOString().split("T")[0]
    : "";

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/children/${child.id}`}
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Torna alla scheda bambino
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Modifica bambino
        </p>
        <h1 className="mt-2 text-4xl font-bold">
          {child.firstName} {child.lastName}
        </h1>
        <p className="mt-2 text-neutral-400">
          Aggiorna i dati principali del bambino.
        </p>
      </div>

      <section className="max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <form action={updateChild} className="grid gap-5 md:grid-cols-2">
          <input type="hidden" name="childId" value={child.id} />

          <div>
            <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-neutral-300">
              Nome
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              defaultValue={child.firstName}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-neutral-300">
              Cognome
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              defaultValue={child.lastName}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="classRoomId" className="mb-2 block text-sm font-medium text-neutral-300">
              Classe
            </label>
            <select
              id="classRoomId"
              name="classRoomId"
              required
              defaultValue={child.classRoomId}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            >
              <option value="">Seleziona una classe</option>
              {classes.map((classRoom: ClassRoomOption) => (
                <option key={classRoom.id} value={classRoom.id}>
                  {classRoom.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="mb-2 block text-sm font-medium text-neutral-300">
              Stato
            </label>
            <select
              id="status"
              name="status"
              defaultValue={child.status}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            >
              <option value="active">Attivo</option>
              <option value="suspended">Sospeso</option>
              <option value="withdrawn">Ritirato</option>
            </select>
          </div>

          <div>
            <label htmlFor="birthDate" className="mb-2 block text-sm font-medium text-neutral-300">
              Data di nascita
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={birthDateValue}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="monthlyFee" className="mb-2 block text-sm font-medium text-neutral-300">
              Retta mensile
            </label>
            <input
              id="monthlyFee"
              name="monthlyFee"
              type="number"
              step="0.01"
              min="0"
              defaultValue={child.monthlyFee ? child.monthlyFee.toString() : ""}
              placeholder="Es. 180.00"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="residence" className="mb-2 block text-sm font-medium text-neutral-300">
              Residenza
            </label>
            <input
              id="residence"
              name="residence"
              type="text"
              defaultValue={child.residence || ""}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="attendanceSchedule"
              className="mb-2 block text-sm font-medium text-neutral-300"
            >
              Orario frequentato
            </label>
            <input
              id="attendanceSchedule"
              name="attendanceSchedule"
              type="text"
              defaultValue={child.attendanceSchedule || ""}
              placeholder="Es. 08:00 - 14:00"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="allergiesNotes"
              className="mb-2 block text-sm font-medium text-neutral-300"
            >
              Allergie / intolleranze
            </label>
            <textarea
              id="allergiesNotes"
              name="allergiesNotes"
              rows={3}
              defaultValue={child.allergiesNotes || ""}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="generalNotes" className="mb-2 block text-sm font-medium text-neutral-300">
              Note generali
            </label>
            <textarea
              id="generalNotes"
              name="generalNotes"
              rows={4}
              defaultValue={child.generalNotes || ""}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div className="md:col-span-2 flex gap-3">
            <Link
              href={`/children/${child.id}`}
              className="flex-1 rounded-xl border border-neutral-700 px-4 py-3 text-center font-semibold text-neutral-200 transition hover:bg-neutral-800"
            >
              Annulla
            </Link>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              Salva modifiche
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
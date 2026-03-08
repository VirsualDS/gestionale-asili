import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStructureSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type EditClassPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function getClassRoom(structureId: string, classId: string) {
  return prisma.classRoom.findFirst({
    where: {
      id: classId,
      structureId,
    },
  });
}

async function updateClass(formData: FormData) {
  "use server";

  const session = await requireStructureSession();

  const classId = String(formData.get("classId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!classId || !name) {
    redirect(`/classes/${classId}/edit?error=missing-name`);
  }

  const existingClass = await prisma.classRoom.findFirst({
    where: {
      id: classId,
      structureId: session.structureId,
    },
  });

  if (!existingClass) {
    redirect("/classes?error=not-found");
  }

  const duplicateClass = await prisma.classRoom.findFirst({
    where: {
      structureId: session.structureId,
      name,
      NOT: {
        id: classId,
      },
    },
  });

  if (duplicateClass) {
    redirect(`/classes/${classId}/edit?error=duplicate`);
  }

  await prisma.classRoom.update({
    where: {
      id: classId,
    },
    data: {
      name,
      description: description || null,
      isActive,
    },
  });

  redirect("/classes?success=updated");
}

export default async function EditClassPage({
  params,
  searchParams,
}: EditClassPageProps) {
  const session = await requireStructureSession();
  const { classId } = await params;
  const qs = searchParams ? await searchParams : undefined;

  const classRoom = await getClassRoom(session.structureId, classId);

  if (!classRoom) {
    notFound();
  }

  const errorMessage =
    qs?.error === "missing-name"
      ? "Il nome della classe è obbligatorio."
      : qs?.error === "duplicate"
      ? "Esiste già una classe con questo nome."
      : null;

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/classes/${classRoom.id}`}
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Torna al dettaglio classe
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Modifica classe
        </p>
        <h1 className="mt-2 text-4xl font-bold">{classRoom.name}</h1>
        <p className="mt-2 text-neutral-400">
          Aggiorna nome, descrizione e stato della classe.
        </p>
      </div>

      <section className="max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <form action={updateClass} className="space-y-5">
          <input type="hidden" name="classId" value={classRoom.id} />

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-neutral-300">
              Nome classe
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={classRoom.name}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-neutral-300"
            >
              Descrizione
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={classRoom.description || ""}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-neutral-300">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={classRoom.isActive}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
            />
            Classe attiva
          </label>

          <div className="flex gap-3">
            <Link
              href={`/classes/${classRoom.id}`}
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
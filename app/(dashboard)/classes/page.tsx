import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function createClass(formData: FormData) {
  "use server";

  const session = await requireSession();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) {
    redirect("/classes?error=missing-name");
  }

  const existingClass = await prisma.classRoom.findFirst({
    where: {
      structureId: session.structureId,
      name,
    },
  });

  if (existingClass) {
    redirect("/classes?error=duplicate");
  }

  await prisma.classRoom.create({
    data: {
      structureId: session.structureId,
      name,
      description: description || null,
      isActive: true,
    },
  });

  redirect("/classes?success=created");
}

async function getClasses(structureId: string) {
  return prisma.classRoom.findMany({
    where: {
      structureId,
    },
    include: {
      _count: {
        select: {
          children: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

type ClassesPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const session = await requireSession();
  const classes = await getClasses(session.structureId);
  const params = searchParams ? await searchParams : undefined;

  const errorMessage =
    params?.error === "missing-name"
      ? "Il nome della classe è obbligatorio."
      : params?.error === "duplicate"
      ? "Esiste già una classe con questo nome."
      : null;

  const successMessage =
    params?.success === "created" ? "Classe creata correttamente." : null;

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Classi</p>
        <h1 className="mt-2 text-4xl font-bold">Gestione classi</h1>
        <p className="mt-2 text-neutral-400">
          Crea e consulta le classi della tua struttura.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Nuova classe</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Inserisci nome e descrizione opzionale della classe.
          </p>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
              {successMessage}
            </div>
          )}

          <form action={createClass} className="mt-6 space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-neutral-300">
                Nome classe
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                placeholder="Sezione Primavera"
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
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
                placeholder="Classe demo iniziale"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              Crea classe
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Classi attive</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Totale classi presenti: {classes.length}
              </p>
            </div>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
              Nessuna classe presente.
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((classRoom) => (
                <Link
                  key={classRoom.id}
                  href={`/classes/${classRoom.id}`}
                  className="block rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-4 transition hover:border-neutral-600"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{classRoom.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {classRoom.description || "Nessuna descrizione"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-neutral-400">Bambini</p>
                      <p className="text-lg font-semibold text-white">
                        {classRoom._count.children}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
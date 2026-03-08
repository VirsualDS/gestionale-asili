import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type EditStructurePageProps = {
  params: Promise<{
    structureId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function getStructure(structureId: string) {
  return prisma.structure.findUnique({
    where: {
      id: structureId,
    },
  });
}

async function updateStructure(formData: FormData) {
  "use server";

  await requirePlatformSession();

  const structureId = String(formData.get("structureId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const accountStatus = String(formData.get("accountStatus") || "active").trim();
  const isActive = formData.get("isActive") === "on";

  if (!structureId || !name) {
    redirect(`/platform/structures/${structureId}/edit?error=missing-name`);
  }

  const existingStructure = await prisma.structure.findUnique({
    where: {
      id: structureId,
    },
  });

  if (!existingStructure) {
    redirect("/platform/structures?error=not-found");
  }

  if (email) {
    const duplicateEmail = await prisma.structure.findFirst({
      where: {
        email,
        NOT: {
          id: structureId,
        },
      },
    });

    if (duplicateEmail) {
      redirect(`/platform/structures/${structureId}/edit?error=duplicate-email`);
    }
  }

  await prisma.structure.update({
    where: {
      id: structureId,
    },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      accountStatus,
      isActive,
    },
  });

  redirect("/platform/structures?success=updated");
}

export default async function EditStructurePage({
  params,
  searchParams,
}: EditStructurePageProps) {
  await requirePlatformSession();

  const { structureId } = await params;
  const qs = searchParams ? await searchParams : undefined;

  const structure = await getStructure(structureId);

  if (!structure) {
    notFound();
  }

  const errorMessage =
    qs?.error === "missing-name"
      ? "Il nome della struttura è obbligatorio."
      : qs?.error === "duplicate-email"
      ? "Esiste già una struttura con questa email."
      : null;

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/platform/structures/${structure.id}`}
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Torna al dettaglio struttura
        </Link>

        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Modifica struttura
        </p>
        <h1 className="mt-2 text-4xl font-bold">{structure.name}</h1>
        <p className="mt-2 text-neutral-400">
          Aggiorna i dati principali della struttura.
        </p>
      </div>

      <section className="max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <form action={updateStructure} className="space-y-5">
          <input type="hidden" name="structureId" value={structure.id} />

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-neutral-300">
              Nome struttura
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={structure.name}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-neutral-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={structure.email || ""}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-neutral-300">
              Telefono
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              defaultValue={structure.phone || ""}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="address" className="mb-2 block text-sm font-medium text-neutral-300">
              Indirizzo
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={structure.address || ""}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label
              htmlFor="accountStatus"
              className="mb-2 block text-sm font-medium text-neutral-300"
            >
              Stato account
            </label>
            <select
              id="accountStatus"
              name="accountStatus"
              defaultValue={structure.accountStatus}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <label className="flex items-center gap-3 text-sm text-neutral-300">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={structure.isActive}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
            />
            Struttura attiva
          </label>

          <div className="flex gap-3">
            <Link
              href={`/platform/structures/${structure.id}`}
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
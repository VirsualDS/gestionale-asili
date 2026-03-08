import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

async function registerStructure(formData: FormData) {
  "use server";

  const structureName = String(formData.get("structureName") || "").trim();
  const structureEmail = String(formData.get("structureEmail") || "").trim().toLowerCase();
  const structurePhone = String(formData.get("structurePhone") || "").trim();
  const structureAddress = String(formData.get("structureAddress") || "").trim();
  const adminName = String(formData.get("adminName") || "").trim();
  const adminEmail = String(formData.get("adminEmail") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (
    !structureName ||
    !structureEmail ||
    !adminName ||
    !adminEmail ||
    !password ||
    !confirmPassword
  ) {
    redirect("/register?error=missing-fields");
  }

  if (password !== confirmPassword) {
    redirect("/register?error=password-mismatch");
  }

  if (password.length < 8) {
    redirect("/register?error=password-too-short");
  }

  const existingStructure = await prisma.structure.findFirst({
    where: {
      OR: [{ email: structureEmail }, { name: structureName }],
    },
  });

  if (existingStructure) {
    redirect("/register?error=structure-exists");
  }

  const existingStructureUser = await prisma.structureUser.findUnique({
    where: {
      email: adminEmail,
    },
  });

  if (existingStructureUser) {
    redirect("/register?error=admin-email-exists");
  }

  const existingPlatformUser = await prisma.platformUser.findUnique({
    where: {
      email: adminEmail,
    },
  });

  if (existingPlatformUser) {
    redirect("/register?error=admin-email-exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const structure = await prisma.structure.create({
    data: {
      name: structureName,
      email: structureEmail,
      phone: structurePhone || null,
      address: structureAddress || null,
      accountStatus: "active",
      isActive: true,
    },
  });

  await prisma.structureUser.create({
    data: {
      structureId: structure.id,
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });

  redirect("/login?success=registered");
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const qs = searchParams ? await searchParams : undefined;

  const errorMessage =
    qs?.error === "missing-fields"
      ? "Compila tutti i campi obbligatori."
      : qs?.error === "password-mismatch"
      ? "Le password non coincidono."
      : qs?.error === "password-too-short"
      ? "La password deve contenere almeno 8 caratteri."
      : qs?.error === "structure-exists"
      ? "Esiste già una struttura con questo nome o questa email."
      : qs?.error === "admin-email-exists"
      ? "L'email dell'amministratore è già utilizzata."
      : null;

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/login"
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            ← Torna al login
          </Link>

          <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
            Registrazione
          </p>
          <h1 className="mt-2 text-4xl font-bold">Crea la tua struttura</h1>
          <p className="mt-2 text-neutral-400">
            Registrazione pubblica per asili e strutture educative. Il ruolo platform
            non è accessibile da qui.
          </p>
        </div>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <form action={registerStructure} className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold">Dati struttura</h2>
            </div>

            <div>
              <label
                htmlFor="structureName"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Nome struttura
              </label>
              <input
                id="structureName"
                name="structureName"
                type="text"
                required
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="structureEmail"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Email struttura
              </label>
              <input
                id="structureEmail"
                name="structureEmail"
                type="email"
                required
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="structurePhone"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Telefono
              </label>
              <input
                id="structurePhone"
                name="structurePhone"
                type="text"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="structureAddress"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Indirizzo
              </label>
              <input
                id="structureAddress"
                name="structureAddress"
                type="text"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div className="md:col-span-2 mt-2">
              <h2 className="text-xl font-semibold">Amministratore struttura</h2>
            </div>

            <div>
              <label
                htmlFor="adminName"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Nome amministratore
              </label>
              <input
                id="adminName"
                name="adminName"
                type="text"
                required
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="adminEmail"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Email amministratore
              </label>
              <input
                id="adminEmail"
                name="adminEmail"
                type="email"
                required
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Conferma password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <Link
                href="/login"
                className="flex-1 rounded-xl border border-neutral-700 px-4 py-3 text-center font-semibold text-neutral-200 transition hover:bg-neutral-800"
              >
                Annulla
              </Link>

              <button
                type="submit"
                className="flex-1 rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
              >
                Registrati
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
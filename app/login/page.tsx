import { redirect } from "next/navigation";
import { loginWithCredentials, getSession } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;
  const errorMessage =
    params?.error === "invalid"
      ? "Email o password non valide."
      : params?.error === "inactive"
      ? "Account struttura non attivo."
      : null;

  async function handleLogin(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      redirect("/login?error=invalid");
    }

    const result = await loginWithCredentials(email, password);

    if (!result.success) {
      if (result.error === "Account struttura non attivo.") {
        redirect("/login?error=inactive");
      }

      redirect("/login?error=invalid");
    }

    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Gestionale Asili
          </p>
          <h1 className="mt-2 text-3xl font-bold">Accesso struttura</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Inserisci le credenziali dell&apos;amministratore della struttura.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <form action={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-neutral-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              placeholder="admin@asilodemo.it"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-neutral-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
          >
            Accedi
          </button>
        </form>

        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
          <p className="font-medium text-neutral-300">Credenziali demo</p>
          <p className="mt-2">Email: admin@asilodemo.it</p>
          <p>Password: Asilo123!</p>
        </div>
      </div>
    </main>
  );
}
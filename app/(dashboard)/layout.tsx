import Link from "next/link";
import { requireSession, logout } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  async function handleLogout() {
    "use server";
    await logout();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <aside className="fixed inset-y-0 left-0 w-72 border-r border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Gestionale Asili</p>
          <h2 className="mt-2 text-2xl font-bold">Pannello struttura</h2>
        </div>

        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="block rounded-xl px-4 py-3 text-neutral-200 transition hover:bg-neutral-800"
          >
            Dashboard
          </Link>
          <Link
            href="/classes"
            className="block rounded-xl px-4 py-3 text-neutral-200 transition hover:bg-neutral-800"
          >
            Classi
          </Link>
          <Link
            href="/children"
            className="block rounded-xl px-4 py-3 text-neutral-200 transition hover:bg-neutral-800"
          >
            Bambini
          </Link>
          <Link
            href="/payments"
            className="block rounded-xl px-4 py-3 text-neutral-200 transition hover:bg-neutral-800"
          >
            Pagamenti
          </Link>
        </nav>

        <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm">
          <p className="text-neutral-500">Utente</p>
          <p className="mt-1 font-medium text-white">{session.email}</p>
          <p className="mt-1 text-neutral-400">Ruolo: {session.role}</p>
        </div>

        <form action={handleLogout} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
          >
            Esci
          </button>
        </form>
      </aside>

      <main className="ml-72 p-8">{children}</main>
    </div>
  );
}
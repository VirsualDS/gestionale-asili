import { prisma } from "@/lib/prisma";

async function getDashboardData() {
  const structure = await prisma.structure.findFirst({
    include: {
      classes: {
        orderBy: {
          name: "asc",
        },
      },
      _count: {
        select: {
          children: true,
          classes: true,
          paymentRequests: true,
        },
      },
    },
  });

  return structure;
}

export default async function HomePage() {
  const structure = await getDashboardData();

  if (!structure) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-4">Gestionale Asili</h1>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-lg font-semibold">Nessuna struttura trovata</p>
            <p className="mt-2 text-neutral-400">
              Il database è collegato, ma non ci sono ancora strutture disponibili.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Dashboard demo
          </p>
          <h1 className="mt-2 text-4xl font-bold">{structure.name}</h1>
          <p className="mt-2 text-neutral-400">
            Prima lettura reale dal database Neon tramite Prisma.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">Stato account</p>
            <p className="mt-2 text-2xl font-semibold">{structure.accountStatus}</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">Classi</p>
            <p className="mt-2 text-2xl font-semibold">{structure._count.classes}</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">Bambini</p>
            <p className="mt-2 text-2xl font-semibold">{structure._count.children}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold mb-4">Classi attuali</h2>

          {structure.classes.length === 0 ? (
            <p className="text-neutral-400">Nessuna classe presente.</p>
          ) : (
            <div className="space-y-3">
              {structure.classes.map((classRoom) => (
                <div
                  key={classRoom.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{classRoom.name}</p>
                    <p className="text-sm text-neutral-500">
                      {classRoom.description || "Nessuna descrizione"}
                    </p>
                  </div>
                  <span className="text-sm text-neutral-400">
                    {classRoom.isActive ? "Attiva" : "Disattivata"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
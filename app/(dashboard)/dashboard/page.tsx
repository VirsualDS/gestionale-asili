import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

async function getDashboardData(structureId: string) {
  const structure = await prisma.structure.findUnique({
    where: { id: structureId },
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
          payments: true,
        },
      },
    },
  });

  return structure;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const structure = await getDashboardData(session.structureId);

  if (!structure) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="text-2xl font-bold">Struttura non trovata</h1>
        <p className="mt-2 text-neutral-400">
          La sessione è valida ma la struttura associata non esiste.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">{structure.name}</h1>
        <p className="mt-2 text-neutral-400">
          Prima dashboard protetta con lettura reale dal database.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4 mb-8">
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

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Richieste pagamento</p>
          <p className="mt-2 text-2xl font-semibold">{structure._count.paymentRequests}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Classi attuali</h2>

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
  );
}
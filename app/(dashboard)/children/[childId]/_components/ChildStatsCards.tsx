type ChildStatsCardsProps = {
  status: string;
  monthlyFee: string | null;
  guardiansCount: number;
  authorizedCount: number;
};

export function ChildStatsCards({
  status,
  monthlyFee,
  guardiansCount,
  authorizedCount,
}: ChildStatsCardsProps) {
  return (
    <section className="mb-8 grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm text-neutral-400">Stato</p>
        <p className="mt-2 text-2xl font-semibold">{status}</p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm text-neutral-400">Retta mensile</p>
        <p className="mt-2 text-2xl font-semibold">
          {monthlyFee ? `${monthlyFee} €` : "—"}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm text-neutral-400">Tutori</p>
        <p className="mt-2 text-2xl font-semibold">{guardiansCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm text-neutral-400">Autorizzati</p>
        <p className="mt-2 text-2xl font-semibold">{authorizedCount}</p>
      </div>
    </section>
  );
}
type GuardianListItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  isPrimaryContact: boolean;
};

type GuardiansListCardProps = {
  childId: string;
  guardians: GuardianListItem[];
  deleteGuardianAction: (formData: FormData) => Promise<void>;
};

export function GuardiansListCard({
  childId,
  guardians,
  deleteGuardianAction,
}: GuardiansListCardProps) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">Tutori registrati</h2>

      {guardians.length === 0 ? (
        <p className="text-neutral-400">Nessun tutore registrato.</p>
      ) : (
        <div className="space-y-3">
          {guardians.map((guardian) => (
            <div
              key={guardian.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">
                    {guardian.firstName} {guardian.lastName || ""}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {guardian.relationship || "Relazione non specificata"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {guardian.phone || "Telefono non presente"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {guardian.email || "Email non presente"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {guardian.isPrimaryContact && (
                    <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-300">
                      Principale
                    </span>
                  )}

                  <form action={deleteGuardianAction}>
                    <input type="hidden" name="childId" value={childId} />
                    <input type="hidden" name="guardianId" value={guardian.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-950/70"
                    >
                      Elimina
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
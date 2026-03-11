type PickupPersonListItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  note: string | null;
};

type PickupPeopleListCardProps = {
  childId: string;
  people: PickupPersonListItem[];
  deleteAuthorizedPickupPersonAction: (formData: FormData) => Promise<void>;
};

export function PickupPeopleListCard({
  childId,
  people,
  deleteAuthorizedPickupPersonAction,
}: PickupPeopleListCardProps) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">Autorizzati al ritiro</h2>

      {people.length === 0 ? (
        <p className="text-neutral-400">
          Nessuna persona autorizzata registrata.
        </p>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <div
              key={person.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">
                    {person.firstName} {person.lastName || ""}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {person.phone || "Telefono non presente"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {person.note || "Nessuna nota"}
                  </p>
                </div>

                <form action={deleteAuthorizedPickupPersonAction}>
                  <input type="hidden" name="childId" value={childId} />
                  <input type="hidden" name="personId" value={person.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-950/70"
                  >
                    Elimina
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
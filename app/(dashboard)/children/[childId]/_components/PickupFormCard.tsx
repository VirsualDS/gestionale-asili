type PickupFormCardProps = {
  childId: string;
  addAuthorizedPickupPersonAction: (formData: FormData) => Promise<void>;
};

export function PickupFormCard({
  childId,
  addAuthorizedPickupPersonAction,
}: PickupFormCardProps) {
  return (
    <details className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <summary className="cursor-pointer list-none text-xl font-semibold text-white">
        Aggiungi autorizzato al ritiro
      </summary>

      <form action={addAuthorizedPickupPersonAction} className="mt-5 space-y-4">
        <input type="hidden" name="childId" value={childId} />

        <div>
          <label
            htmlFor="pickup-firstName"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Nome
          </label>
          <input
            id="pickup-firstName"
            name="firstName"
            type="text"
            required
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="pickup-lastName"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Cognome
          </label>
          <input
            id="pickup-lastName"
            name="lastName"
            type="text"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="pickup-phone"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Telefono
          </label>
          <input
            id="pickup-phone"
            name="phone"
            type="text"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="pickup-note"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Nota
          </label>
          <textarea
            id="pickup-note"
            name="note"
            rows={3}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl border border-neutral-700 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-800"
        >
          Salva autorizzato
        </button>
      </form>
    </details>
  );
}
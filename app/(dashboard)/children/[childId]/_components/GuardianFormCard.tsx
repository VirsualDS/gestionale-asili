type GuardianFormCardProps = {
  childId: string;
  addGuardianAction: (formData: FormData) => Promise<void>;
};

export function GuardianFormCard({
  childId,
  addGuardianAction,
}: GuardianFormCardProps) {
  return (
    <details className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <summary className="cursor-pointer list-none text-xl font-semibold text-white">
        Aggiungi tutore
      </summary>

      <form action={addGuardianAction} className="mt-5 space-y-4">
        <input type="hidden" name="childId" value={childId} />

        <div>
          <label
            htmlFor="guardian-firstName"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Nome
          </label>
          <input
            id="guardian-firstName"
            name="firstName"
            type="text"
            required
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="guardian-lastName"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Cognome
          </label>
          <input
            id="guardian-lastName"
            name="lastName"
            type="text"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="guardian-phone"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Telefono
          </label>
          <input
            id="guardian-phone"
            name="phone"
            type="text"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="guardian-email"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Email
          </label>
          <input
            id="guardian-email"
            name="email"
            type="email"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="guardian-relationship"
            className="mb-2 block text-sm font-medium text-neutral-300"
          >
            Relazione
          </label>
          <input
            id="guardian-relationship"
            name="relationship"
            type="text"
            placeholder="Es. madre, padre, tutore"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-neutral-300">
          <input
            type="checkbox"
            name="isPrimaryContact"
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
          />
          Imposta come contatto principale
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-neutral-200"
        >
          Salva tutore
        </button>
      </form>
    </details>
  );
}
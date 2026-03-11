import Link from "next/link";

type ChildHeaderProps = {
  childId: string;
  fullName: string;
  classRoomName: string;
  deleteChildAction: (formData: FormData) => Promise<void>;
};

export function ChildHeader({
  childId,
  fullName,
  classRoomName,
  deleteChildAction,
}: ChildHeaderProps) {
  return (
    <div className="mb-8">
      <Link
        href="/children"
        className="text-sm text-neutral-400 transition hover:text-white"
      >
        ← Torna ai bambini
      </Link>

      <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
        Scheda bambino
      </p>
      <h1 className="mt-2 text-4xl font-bold">{fullName}</h1>
      <p className="mt-2 text-neutral-400">Classe: {classRoomName}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/children/${childId}/edit`}
          className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
        >
          Modifica bambino
        </Link>

        <form action={deleteChildAction}>
          <input type="hidden" name="childId" value={childId} />
          <button
            type="submit"
            className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/70"
          >
            Elimina bambino
          </button>
        </form>
      </div>
    </div>
  );
}
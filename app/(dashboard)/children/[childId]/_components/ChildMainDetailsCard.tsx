import { formatDate } from "../_lib/child-detail-utils";

type ChildMainDetailsCardProps = {
  firstName: string;
  lastName: string;
  birthDate?: Date | string | null;
  attendanceSchedule?: string | null;
  residence?: string | null;
  allergiesNotes?: string | null;
  generalNotes?: string | null;
};

export function ChildMainDetailsCard({
  firstName,
  lastName,
  birthDate,
  attendanceSchedule,
  residence,
  allergiesNotes,
  generalNotes,
}: ChildMainDetailsCardProps) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">Dati principali</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-neutral-500">Nome</p>
          <p className="mt-1 text-white">{firstName}</p>
        </div>

        <div>
          <p className="text-sm text-neutral-500">Cognome</p>
          <p className="mt-1 text-white">{lastName}</p>
        </div>

        <div>
          <p className="text-sm text-neutral-500">Data di nascita</p>
          <p className="mt-1 text-white">{formatDate(birthDate)}</p>
        </div>

        <div>
          <p className="text-sm text-neutral-500">Orario frequentato</p>
          <p className="mt-1 text-white">{attendanceSchedule || "—"}</p>
        </div>

        <div className="md:col-span-2">
          <p className="text-sm text-neutral-500">Residenza</p>
          <p className="mt-1 text-white">{residence || "—"}</p>
        </div>

        <div className="md:col-span-2">
          <p className="text-sm text-neutral-500">Allergie / intolleranze</p>
          <p className="mt-1 whitespace-pre-wrap text-white">
            {allergiesNotes || "—"}
          </p>
        </div>

        <div className="md:col-span-2">
          <p className="text-sm text-neutral-500">Note generali</p>
          <p className="mt-1 whitespace-pre-wrap text-white">
            {generalNotes || "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/auth";
import {
  toggleStructureUserStatus,
  updateStructurePaymentSetupStatus,
} from "./actions";
import {
  refreshStructureStripeStatus,
  startStructureStripeOnboarding,
} from "./stripe-actions";

export const dynamic = "force-dynamic";

type PlatformStructureDetailPageProps = {
  params: Promise<{
    structureId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

async function getStructureDetail(structureId: string) {
  return prisma.structure.findUnique({
    where: {
      id: structureId,
    },
    include: {
      users: {
        orderBy: [{ createdAt: "asc" }],
      },
      classes: {
        orderBy: [{ name: "asc" }],
        include: {
          _count: {
            select: {
              children: true,
            },
          },
        },
      },
      _count: {
        select: {
          users: true,
          classes: true,
          children: true,
          paymentRequests: true,
          payments: true,
        },
      },
    },
  });
}

type StructureDetail = NonNullable<Awaited<ReturnType<typeof getStructureDetail>>>;
type StructureUserItem = StructureDetail["users"][number];
type StructureClassItem = StructureDetail["classes"][number];

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getAccountStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
    case "active":
      return "Attivo";
    case "INACTIVE":
    case "inactive":
      return "Inattivo";
    case "SUSPENDED":
    case "suspended":
      return "Sospeso";
    case "PENDING":
    case "pending":
      return "In attesa";
    case "TRIAL":
    case "trial":
      return "Trial";
    case "CANCELLED":
    case "cancelled":
      return "Cancellato";
    default:
      return status;
  }
}

function getAccountStatusClasses(status: string) {
  switch (status) {
    case "ACTIVE":
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "INACTIVE":
    case "inactive":
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
    case "SUSPENDED":
    case "suspended":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "PENDING":
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "TRIAL":
    case "trial":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "CANCELLED":
    case "cancelled":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }
}

function getPaymentSetupStatusLabel(status: string) {
  switch (status) {
    case "not_configured":
      return "Non configurato";
    case "pending":
      return "In attesa";
    case "enabled":
      return "Abilitato";
    case "blocked":
      return "Bloccato";
    default:
      return status;
  }
}

function getPaymentSetupStatusClasses(status: string) {
  switch (status) {
    case "enabled":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "blocked":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "not_configured":
    default:
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }
}

function getBooleanBadgeClasses(value: boolean) {
  return value
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : "border-red-500/30 bg-red-500/10 text-red-300";
}

function getUserDisplayName(user: StructureUserItem) {
  if (user.name && user.name.trim().length > 0) {
    return user.name;
  }

  return user.email;
}

function getStripeAccountStatusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Attivo";
    case "pending":
      return "In attesa";
    case "restricted":
      return "Limitato";
    case "disabled":
      return "Disabilitato";
    default:
      return "Non collegato";
  }
}

function getStripeAccountStatusClasses(status?: string | null) {
  switch (status) {
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "restricted":
    case "disabled":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }
}

export default async function PlatformStructureDetailPage({
  params,
  searchParams,
}: PlatformStructureDetailPageProps) {
  await requirePlatformSession();
  const { structureId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const structure = await getStructureDetail(structureId);

  if (!structure) {
    notFound();
  }

  const errorMessage =
    resolvedSearchParams?.error === "invalid-payment-setup-status"
      ? "Stato setup pagamenti non valido."
      : resolvedSearchParams?.error === "invalid-user"
      ? "Utente non valido."
      : resolvedSearchParams?.error === "user-not-found"
      ? "Utente struttura non trovato."
      : resolvedSearchParams?.error === "stripe-account-missing"
      ? "Account Stripe non collegato alla struttura."
      : resolvedSearchParams?.error === "stripe-onboarding-refresh"
      ? "Onboarding Stripe non completato. Puoi riprendere la procedura."
      : null;

  const successMessage =
    resolvedSearchParams?.success === "payment-setup-status-updated"
      ? "Stato setup pagamenti aggiornato correttamente."
      : resolvedSearchParams?.success === "user-status-updated"
      ? "Stato utente aggiornato correttamente."
      : resolvedSearchParams?.success === "stripe-onboarding-return"
      ? "Rientro da Stripe completato. Ora sincronizza lo stato."
      : resolvedSearchParams?.success === "stripe-status-refreshed"
      ? "Stato Stripe sincronizzato correttamente."
      : null;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/platform/structures"
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            ← Torna alle strutture
          </Link>

          <p className="mt-6 text-sm uppercase tracking-[0.2em] text-neutral-500">
            Dettaglio struttura
          </p>

          <div className="mt-2 flex flex-col gap-3">
            <h1 className="text-4xl font-bold text-white">{structure.name}</h1>

            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getAccountStatusClasses(
                  structure.accountStatus
                )}`}
              >
                Account: {getAccountStatusLabel(structure.accountStatus)}
              </span>

              <span
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getBooleanBadgeClasses(
                  structure.isActive
                )}`}
              >
                {structure.isActive ? "Struttura attiva" : "Struttura disattiva"}
              </span>

              <span
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getPaymentSetupStatusClasses(
                  structure.paymentSetupStatus
                )}`}
              >
                Pagamenti: {getPaymentSetupStatusLabel(structure.paymentSetupStatus)}
              </span>

              <span
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getStripeAccountStatusClasses(
                  structure.stripeAccountStatus
                )}`}
              >
                Stripe: {getStripeAccountStatusLabel(structure.stripeAccountStatus)}
              </span>
            </div>
          </div>

          <p className="mt-3 text-neutral-400">
            {structure.email || "Email non presente"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/platform/structures/${structure.id}/edit`}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-800"
          >
            Modifica struttura
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stato account</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {getAccountStatusLabel(structure.accountStatus)}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Struttura attiva</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {structure.isActive ? "Sì" : "No"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stato pagamenti</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {getPaymentSetupStatusLabel(structure.paymentSetupStatus)}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stripe account</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {getStripeAccountStatusLabel(structure.stripeAccountStatus)}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Utenti</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {structure._count.users}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Bambini</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {structure._count.children}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Dati struttura</h2>
            <Link
              href={`/platform/structures/${structure.id}/edit`}
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              Modifica
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Nome</p>
              <p className="mt-1 text-sm font-medium text-white">{structure.name}</p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Email</p>
              <p className="mt-1 text-sm font-medium text-white">
                {structure.email || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Telefono</p>
              <p className="mt-1 text-sm font-medium text-white">
                {structure.phone || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Indirizzo</p>
              <p className="mt-1 text-sm font-medium text-white">
                {structure.address || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Creata il</p>
              <p className="mt-1 text-sm font-medium text-white">
                {formatDate(structure.createdAt)}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Ultimo aggiornamento</p>
              <p className="mt-1 text-sm font-medium text-white">
                {formatDate(structure.updatedAt)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Stripe Connect</h2>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-400">Stripe account ID</span>
                <span className="font-medium text-white">
                  {structure.stripeAccountId || "Non collegato"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-400">Status account Stripe</span>
                <span className="font-medium text-white">
                  {getStripeAccountStatusLabel(structure.stripeAccountStatus)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-400">Charges enabled</span>
                <span className="font-medium text-white">
                  {structure.stripeChargesEnabled ? "Sì" : "No"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-400">Payouts enabled</span>
                <span className="font-medium text-white">
                  {structure.stripePayoutsEnabled ? "Sì" : "No"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-400">Details submitted</span>
                <span className="font-medium text-white">
                  {structure.stripeDetailsSubmitted ? "Sì" : "No"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-400">Onboarding avviato</span>
                <span className="font-medium text-white">
                  {structure.stripeOnboardingStartedAt
                    ? formatDate(structure.stripeOnboardingStartedAt)
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-400">Onboarding completato</span>
                <span className="font-medium text-white">
                  {structure.stripeOnboardingCompletedAt
                    ? formatDate(structure.stripeOnboardingCompletedAt)
                    : "—"}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <form action={startStructureStripeOnboarding}>
                <input type="hidden" name="structureId" value={structure.id} />
                <button
                  type="submit"
                  className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                >
                  {structure.stripeAccountId
                    ? "Riprendi / aggiorna onboarding Stripe"
                    : "Collega Stripe"}
                </button>
              </form>

              <form action={refreshStructureStripeStatus}>
                <input type="hidden" name="structureId" value={structure.id} />
                <button
                  type="submit"
                  className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                >
                  Sincronizza stato Stripe
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Setup pagamenti</h2>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-sm text-neutral-400">
            Stato attuale:{" "}
            <span className="font-medium text-white">
              {getPaymentSetupStatusLabel(structure.paymentSetupStatus)}
            </span>
          </p>

          <form action={updateStructurePaymentSetupStatus} className="mt-4 space-y-4">
            <input type="hidden" name="structureId" value={structure.id} />

            <div>
              <label
                htmlFor="paymentSetupStatus"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Cambia stato setup pagamenti
              </label>
              <select
                id="paymentSetupStatus"
                name="paymentSetupStatus"
                defaultValue={structure.paymentSetupStatus}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              >
                <option value="not_configured">Non configurato</option>
                <option value="pending">In attesa</option>
                <option value="enabled">Abilitato</option>
                <option value="blocked">Bloccato</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Aggiorna stato pagamenti
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Utenti struttura</h2>
          <p className="text-sm text-neutral-500">
            Totale: {structure._count.users}
          </p>
        </div>

        {structure.users.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-400">Nessun utente associato.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {structure.users.map((user: StructureUserItem) => (
              <div
                key={user.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-white">{getUserDisplayName(user)}</p>
                    <p className="mt-1 text-sm text-neutral-400">{user.email}</p>
                    <p className="mt-2 text-sm text-neutral-500">Ruolo: {user.role}</p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:items-end">
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getBooleanBadgeClasses(
                        user.isActive
                      )}`}
                    >
                      {user.isActive ? "Attivo" : "Disattivato"}
                    </span>

                    <form action={toggleStructureUserStatus}>
                      <input type="hidden" name="structureId" value={structure.id} />
                      <input type="hidden" name="userId" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                      >
                        {user.isActive ? "Disattiva utente" : "Attiva utente"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Classi della struttura</h2>
          <p className="text-sm text-neutral-500">
            Totale: {structure._count.classes}
          </p>
        </div>

        {structure.classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-400">Nessuna classe presente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {structure.classes.map((classRoom: StructureClassItem) => (
              <div
                key={classRoom.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{classRoom.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {classRoom.description || "Nessuna descrizione"}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 text-sm sm:items-end">
                  <span
                    className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${getBooleanBadgeClasses(
                      classRoom.isActive
                    )}`}
                  >
                    {classRoom.isActive ? "Attiva" : "Disattivata"}
                  </span>

                  <p className="text-neutral-400">
                    Bambini: {classRoom._count.children}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Panoramica economica</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-500">Richieste di pagamento</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {structure._count.paymentRequests}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-500">Pagamenti registrati</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {structure._count.payments}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-500">Stato setup pagamenti</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {getPaymentSetupStatusLabel(structure.paymentSetupStatus)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
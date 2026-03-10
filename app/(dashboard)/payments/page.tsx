import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStructureSession } from "@/lib/auth";
import { generateMonthlyPaymentLink } from "./actions";
import {
  refreshStructureStripeStatusFromDashboard,
  startStructureStripeOnboardingFromDashboard,
} from "./stripe-actions";

export const dynamic = "force-dynamic";

type PaymentsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

async function getPaymentsPageData(structureId: string) {
  return prisma.structure.findUnique({
    where: {
      id: structureId,
    },
    select: {
      id: true,
      name: true,
      paymentSetupStatus: true,
      stripeAccountId: true,
      stripeAccountStatus: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      classes: {
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          children: {
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
            select: {
              id: true,
              firstName: true,
              lastName: true,
              monthlyFee: true,
              status: true,
              paymentRequests: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
                select: {
                  id: true,
                  title: true,
                  status: true,
                  publicToken: true,
                  publicLink: true,
                  createdAt: true,
                  paidAt: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

type PaymentsPageData = NonNullable<Awaited<ReturnType<typeof getPaymentsPageData>>>;
type PaymentsClassItem = PaymentsPageData["classes"][number];
type PaymentsChildItem = PaymentsClassItem["children"][number];

function formatCurrency(value: string | number) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(numericValue);
}

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function getPaymentRequestStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "In attesa";
    case "checkout_created":
      return "Link generato";
    case "paid":
      return "Pagato";
    case "overdue":
      return "Scaduto";
    case "cancelled":
      return "Annullato";
    case "expired":
      return "Link scaduto";
    default:
      return status;
  }
}

function getPaymentRequestStatusClasses(status: string) {
  switch (status) {
    case "paid":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
    case "checkout_created":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "overdue":
    case "cancelled":
    case "expired":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-neutral-700 bg-neutral-800 text-neutral-300";
  }
}

function getChildFullName(child: PaymentsChildItem) {
  return `${child.firstName} ${child.lastName}`.trim();
}

function getWhatsAppShareUrl(params: {
  childName: string;
  title: string;
  amount: string;
  publicLink: string;
}) {
  const message =
    `Ciao, ti invio il link per il pagamento.\n\n` +
    `Bambino: ${params.childName}\n` +
    `Causale: ${params.title}\n` +
    `Importo: ${params.amount}\n\n` +
    `Link pagamento: ${params.publicLink}`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const session = await requireStructureSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const structure = await getPaymentsPageData(session.structureId);

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

  const paymentsEnabled =
    structure.paymentSetupStatus === "enabled" &&
    !!structure.stripeAccountId &&
    structure.stripeChargesEnabled &&
    structure.stripePayoutsEnabled &&
    structure.stripeDetailsSubmitted;

  const errorMessage =
    resolvedSearchParams?.error === "invalid-child"
      ? "Bambino non valido."
      : resolvedSearchParams?.error === "child-not-found"
      ? "Bambino non trovato."
      : resolvedSearchParams?.error === "child-not-active"
      ? "Il bambino non è attivo e non può ricevere una richiesta di pagamento."
      : resolvedSearchParams?.error === "missing-monthly-fee"
      ? "Prima di generare il link devi impostare la retta mensile nella scheda del bambino."
      : resolvedSearchParams?.error === "payments-not-enabled"
      ? "La struttura non è ancora abilitata ai pagamenti online."
      : resolvedSearchParams?.error === "structure-not-found"
      ? "Struttura non trovata."
      : resolvedSearchParams?.error === "stripe-account-missing"
      ? "Account Stripe non collegato alla struttura."
      : resolvedSearchParams?.error === "stripe-onboarding-refresh"
      ? "Onboarding Stripe non completato. Puoi riprendere la procedura."
      : null;

  const successMessage =
    resolvedSearchParams?.success === "link-generated"
      ? "Link di pagamento generato correttamente."
      : resolvedSearchParams?.success === "link-ready"
      ? "Esisteva già una richiesta attiva: il link è pronto."
      : resolvedSearchParams?.success === "stripe-onboarding-return"
      ? "Rientro da Stripe completato. Ora sincronizza lo stato."
      : resolvedSearchParams?.success === "stripe-status-refreshed"
      ? "Stato Stripe sincronizzato correttamente."
      : null;

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Pagamenti</p>
        <h1 className="mt-2 text-4xl font-bold">Incassi e link pagamento</h1>
        <p className="mt-2 text-neutral-400">
          Collega Stripe, verifica lo stato della struttura e genera i link di pagamento
          per le rette mensili dei bambini.
        </p>
      </header>

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

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Setup pagamenti</p>
          <span
            className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getPaymentSetupStatusClasses(
              structure.paymentSetupStatus
            )}`}
          >
            {getPaymentSetupStatusLabel(structure.paymentSetupStatus)}
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stripe account</p>
          <span
            className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStripeAccountStatusClasses(
              structure.stripeAccountStatus
            )}`}
          >
            {getStripeAccountStatusLabel(structure.stripeAccountStatus)}
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Charges enabled</p>
          <p className="mt-2 text-2xl font-semibold">
            {structure.stripeChargesEnabled ? "Sì" : "No"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Payouts enabled</p>
          <p className="mt-2 text-2xl font-semibold">
            {structure.stripePayoutsEnabled ? "Sì" : "No"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Dettagli inviati</p>
          <p className="mt-2 text-2xl font-semibold">
            {structure.stripeDetailsSubmitted ? "Sì" : "No"}
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Attivazione incassi Stripe</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Collega il tuo account Stripe, completa l’onboarding e poi sincronizza lo
              stato per abilitare la generazione dei link di pagamento.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <form action={startStructureStripeOnboardingFromDashboard}>
              <button
                type="submit"
                className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                {structure.stripeAccountId
                  ? "Riprendi / aggiorna onboarding Stripe"
                  : "Collega Stripe"}
              </button>
            </form>

            <form action={refreshStructureStripeStatusFromDashboard}>
              <button
                type="submit"
                className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                Sincronizza stato Stripe
              </button>
            </form>
          </div>
        </div>

        {!paymentsEnabled ? (
          <div className="mt-5 rounded-xl border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-200">
            Gli incassi online non sono ancora attivi. Completa l’onboarding Stripe e
            assicurati che lo stato pagamenti della struttura risulti “Abilitato”.
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            La struttura è pronta a generare link di pagamento per i genitori.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Rette mensili per classe</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Per ogni bambino puoi generare un link di pagamento partendo dalla retta
            mensile già salvata nella sua scheda.
          </p>
        </div>

        {structure.classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
            Nessuna classe presente.
          </div>
        ) : (
          <div className="space-y-6">
            {structure.classes.map((classRoom: PaymentsClassItem) => (
              <section
                key={classRoom.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
              >
                <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{classRoom.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {classRoom.description || "Nessuna descrizione"}
                    </p>
                  </div>

                  <span className="text-sm text-neutral-400">
                    {classRoom.isActive ? "Classe attiva" : "Classe disattivata"}
                  </span>
                </div>

                {classRoom.children.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
                    Nessun bambino presente in questa classe.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {classRoom.children.map((child: PaymentsChildItem) => {
                      const latestRequest = child.paymentRequests[0] ?? null;
                      const hasMonthlyFee = child.monthlyFee !== null;
                      const canGenerateLink = paymentsEnabled && hasMonthlyFee;

                      const publicLink = latestRequest?.publicLink || null;
                      const whatsappUrl =
                        latestRequest?.publicLink
                          ? getWhatsAppShareUrl({
                              childName: getChildFullName(child),
                              title: latestRequest.title,
                              amount: formatCurrency(child.monthlyFee!.toString()),
                              publicLink: latestRequest.publicLink,
                            })
                          : null;

                      return (
                        <div
                          key={child.id}
                          className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">
                                {getChildFullName(child)}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                <span className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1 text-neutral-300">
                                  Stato bambino: {child.status}
                                </span>

                                <span className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1 text-neutral-300">
                                  Retta mensile:{" "}
                                  {hasMonthlyFee
                                    ? formatCurrency(child.monthlyFee!.toString())
                                    : "Non impostata"}
                                </span>

                                {latestRequest && (
                                  <span
                                    className={`rounded-lg border px-3 py-1 ${getPaymentRequestStatusClasses(
                                      latestRequest.status
                                    )}`}
                                  >
                                    Ultima richiesta:{" "}
                                    {getPaymentRequestStatusLabel(latestRequest.status)}
                                  </span>
                                )}
                              </div>

                              {latestRequest && (
                                <div className="mt-3 text-sm text-neutral-400">
                                  <p>
                                    Titolo:{" "}
                                    <span className="text-neutral-200">
                                      {latestRequest.title}
                                    </span>
                                  </p>
                                  <p className="mt-1">
                                    Creata il: {formatDate(latestRequest.createdAt)}
                                  </p>
                                  {latestRequest.paidAt && (
                                    <p className="mt-1">
                                      Pagata il: {formatDate(latestRequest.paidAt)}
                                    </p>
                                  )}
                                </div>
                              )}

                              {!hasMonthlyFee && (
                                <div className="mt-3 rounded-lg border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                                  Prima di generare un link, imposta la retta mensile nella
                                  scheda del bambino.
                                </div>
                              )}

                              {!paymentsEnabled && (
                                <div className="mt-3 rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                                  I pagamenti online non sono ancora attivi per questa
                                  struttura.
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3 xl:w-[420px] xl:justify-end">
                              <form action={generateMonthlyPaymentLink}>
                                <input type="hidden" name="childId" value={child.id} />
                                <button
                                  type="submit"
                                  disabled={!canGenerateLink}
                                  className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition enabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Genera link pagamento
                                </button>
                              </form>

                              {publicLink ? (
                                <>
                                  <Link
                                    href={publicLink}
                                    target="_blank"
                                    className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                                  >
                                    Apri link
                                  </Link>

                                  {whatsappUrl ? (
                                    <Link
                                      href={whatsappUrl}
                                      target="_blank"
                                      className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
                                    >
                                      Condividi WhatsApp
                                    </Link>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled
                                    className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 opacity-40"
                                  >
                                    Apri link
                                  </button>

                                  <button
                                    type="button"
                                    disabled
                                    className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 opacity-40"
                                  >
                                    Condividi WhatsApp
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
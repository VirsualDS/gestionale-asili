import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStructureSession } from "@/lib/auth";
import {
  cancelPaymentRequest,
  generateMonthlyPaymentLink,
  registerManualPayment,
} from "./actions";
import {
  refreshStructureStripeStatusFromDashboard,
  startStructureStripeOnboardingFromDashboard,
} from "./stripe-actions";

export const dynamic = "force-dynamic";

type PaymentsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    q?: string;
    classId?: string;
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
                take: 5,
                select: {
                  id: true,
                  title: true,
                  status: true,
                  publicToken: true,
                  publicLink: true,
                  createdAt: true,
                  paidAt: true,
                  amount: true,
                  payments: {
                    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
                    take: 1,
                    select: {
                      id: true,
                      status: true,
                      provider: true,
                      providerRef: true,
                      amount: true,
                      paidAt: true,
                      createdAt: true,
                    },
                  },
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
type PaymentRequestItem = PaymentsChildItem["paymentRequests"][number];
type PaymentItem = PaymentRequestItem["payments"][number];

type PaymentsChildRow = {
  id: string;
  firstName: string;
  lastName: string;
  monthlyFee: PaymentsChildItem["monthlyFee"];
  status: string;
  classId: string;
  className: string;
  classIsActive: boolean;
  latestRequest: PaymentRequestItem | null;
  latestPayment: PaymentItem | null;
};

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

function getPaymentProviderLabel(provider?: string | null, providerRef?: string | null) {
  if (provider === "stripe") {
    return "Online Stripe";
  }

  if (provider === "manual") {
    if (providerRef === "cash") return "Manuale · Contanti";
    if (providerRef === "bank_transfer") return "Manuale · Bonifico";
    if (providerRef === "pos") return "Manuale · POS";
    return "Manuale";
  }

  return provider || "—";
}

function getPaymentProviderClasses(provider?: string | null) {
  if (provider === "stripe") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (provider === "manual") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  return "border-neutral-700 bg-neutral-800 text-neutral-300";
}

function getChildFullName(child: { firstName: string; lastName: string }) {
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
      : resolvedSearchParams?.error === "invalid-manual-method"
      ? "Metodo di pagamento manuale non valido."
      : resolvedSearchParams?.error === "invalid-request"
      ? "Richiesta non valida."
      : resolvedSearchParams?.error === "request-not-found"
      ? "Richiesta non trovata."
      : resolvedSearchParams?.error === "request-not-cancellable"
      ? "Questa richiesta non può essere annullata."
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
      : resolvedSearchParams?.success === "manual-payment-registered"
      ? "Pagamento manuale registrato correttamente."
      : resolvedSearchParams?.success === "request-cancelled"
      ? "Richiesta annullata correttamente."
      : null;

  const query = resolvedSearchParams?.q?.trim() || "";
  const selectedClassId = resolvedSearchParams?.classId?.trim() || "";

  const childRows: PaymentsChildRow[] = structure.classes.flatMap((classRoom) =>
    classRoom.children.map((child) => {
      const latestRequest = child.paymentRequests[0] ?? null;
      const latestPayment =
        child.paymentRequests
          .flatMap((request) => request.payments)
          .sort((a, b) => {
            const aTime = new Date(a.paidAt || a.createdAt).getTime();
            const bTime = new Date(b.paidAt || b.createdAt).getTime();
            return bTime - aTime;
          })[0] ?? null;

      return {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        monthlyFee: child.monthlyFee,
        status: child.status,
        classId: classRoom.id,
        className: classRoom.name,
        classIsActive: classRoom.isActive,
        latestRequest,
        latestPayment,
      };
    })
  );

  const filteredRows = childRows.filter((row) => {
    const matchesClass = !selectedClassId || row.classId === selectedClassId;
    const fullName = `${row.firstName} ${row.lastName}`.toLowerCase();
    const matchesQuery =
      !query ||
      fullName.includes(query.toLowerCase()) ||
      row.className.toLowerCase().includes(query.toLowerCase());

    return matchesClass && matchesQuery;
  });

  const totalChildren = childRows.length;
  const childrenWithMonthlyFee = childRows.filter((row) => row.monthlyFee !== null).length;
  const paidChildren = childRows.filter((row) => row.latestRequest?.status === "paid").length;
  const openRequests = childRows.filter(
    (row) =>
      row.latestRequest?.status === "pending" ||
      row.latestRequest?.status === "checkout_created"
  ).length;

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">Pagamenti</p>
        <h1 className="mt-2 text-4xl font-bold">Incassi e link pagamento</h1>
        <p className="mt-2 text-neutral-400">
          Collega Stripe, verifica lo stato della struttura e gestisci pagamenti online
          e manuali dei bambini in modo ordinato.
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
          <span className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getPaymentSetupStatusClasses(structure.paymentSetupStatus)}`}>
            {getPaymentSetupStatusLabel(structure.paymentSetupStatus)}
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Stripe account</p>
          <span className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStripeAccountStatusClasses(structure.stripeAccountStatus)}`}>
            {getStripeAccountStatusLabel(structure.stripeAccountStatus)}
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Charges enabled</p>
          <p className="mt-2 text-2xl font-semibold">{structure.stripeChargesEnabled ? "Sì" : "No"}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Payouts enabled</p>
          <p className="mt-2 text-2xl font-semibold">{structure.stripePayoutsEnabled ? "Sì" : "No"}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Dettagli inviati</p>
          <p className="mt-2 text-2xl font-semibold">{structure.stripeDetailsSubmitted ? "Sì" : "No"}</p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Attivazione incassi Stripe</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Collega il tuo account Stripe, completa l’onboarding e poi sincronizza lo stato per abilitare la generazione dei link di pagamento.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <form action={startStructureStripeOnboardingFromDashboard}>
              <button type="submit" className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800">
                {structure.stripeAccountId ? "Riprendi / aggiorna onboarding Stripe" : "Collega Stripe"}
              </button>
            </form>

            <form action={refreshStructureStripeStatusFromDashboard}>
              <button type="submit" className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800">
                Sincronizza stato Stripe
              </button>
            </form>
          </div>
        </div>

        {!paymentsEnabled ? (
          <div className="mt-5 rounded-xl border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-200">
            Gli incassi online non sono ancora attivi. Completa l’onboarding Stripe e assicurati che lo stato pagamenti della struttura risulti “Abilitato”.
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            La struttura è pronta a generare link di pagamento per i genitori.
          </div>
        )}
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Bambini totali</p>
          <p className="mt-2 text-2xl font-semibold">{totalChildren}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Con retta impostata</p>
          <p className="mt-2 text-2xl font-semibold">{childrenWithMonthlyFee}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Richieste aperte</p>
          <p className="mt-2 text-2xl font-semibold">{openRequests}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Pagati</p>
          <p className="mt-2 text-2xl font-semibold">{paidChildren}</p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Gestione rette bambini</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Cerca un bambino, filtra per classe e gestisci separatamente pagamenti online e pagamenti manuali.
            </p>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-[1fr_260px_auto]">
          <div>
            <label htmlFor="q" className="mb-2 block text-sm font-medium text-neutral-300">Cerca bambino o classe</label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Es. Marco Rossi"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            />
          </div>

          <div>
            <label htmlFor="classId" className="mb-2 block text-sm font-medium text-neutral-300">Filtra per classe</label>
            <select
              id="classId"
              name="classId"
              defaultValue={selectedClassId}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
            >
              <option value="">Tutte le classi</option>
              {structure.classes.map((classRoom) => (
                <option key={classRoom.id} value={classRoom.id}>
                  {classRoom.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button type="submit" className="rounded-xl border border-neutral-700 px-4 py-3 font-medium text-neutral-200 transition hover:bg-neutral-800">
              Cerca
            </button>

            <Link href="/payments" className="rounded-xl border border-neutral-700 px-4 py-3 font-medium text-neutral-200 transition hover:bg-neutral-800">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Lista bambini</h2>
          <p className="mt-2 text-sm text-neutral-400">Risultati mostrati: {filteredRows.length}</p>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">
            Nessun bambino trovato con i filtri attuali.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRows.map((row) => {
              const hasMonthlyFee = row.monthlyFee !== null;
              const isAlreadyPaid = row.latestRequest?.status === "paid";
              const hasOpenRequest =
                row.latestRequest?.status === "pending" ||
                row.latestRequest?.status === "checkout_created";

              const canGenerateLink = paymentsEnabled && hasMonthlyFee && !isAlreadyPaid && !hasOpenRequest;
              const canRegisterManual = hasMonthlyFee && !isAlreadyPaid && !hasOpenRequest;

              const publicLink = row.latestRequest?.publicLink || null;
              const canCancelRequest = hasOpenRequest;

              const whatsappUrl =
                row.latestRequest?.publicLink && hasMonthlyFee
                  ? getWhatsAppShareUrl({
                      childName: getChildFullName(row),
                      title: row.latestRequest.title,
                      amount: formatCurrency(row.monthlyFee!.toString()),
                      publicLink: row.latestRequest.publicLink,
                    })
                  : null;

              return (
                <div key={row.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{getChildFullName(row)}</h3>
                        <span className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
                          Classe: {row.className}
                        </span>
                        <span className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
                          {row.classIsActive ? "Classe attiva" : "Classe disattivata"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                          Stato bambino: {row.status}
                        </span>

                        <span className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-neutral-300">
                          Retta mensile: {hasMonthlyFee ? formatCurrency(row.monthlyFee!.toString()) : "Non impostata"}
                        </span>

                        {row.latestRequest && (
                          <span className={`rounded-lg border px-3 py-1 ${getPaymentRequestStatusClasses(row.latestRequest.status)}`}>
                            Richiesta: {getPaymentRequestStatusLabel(row.latestRequest.status)}
                          </span>
                        )}

                        {row.latestPayment && (
                          <span className={`rounded-lg border px-3 py-1 ${getPaymentProviderClasses(row.latestPayment.provider)}`}>
                            Ultimo incasso: {getPaymentProviderLabel(row.latestPayment.provider, row.latestPayment.providerRef)}
                          </span>
                        )}
                      </div>

                      {row.latestRequest && (
                        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
                          <p className="font-medium text-neutral-200">Ultima richiesta retta</p>
                          <p className="mt-2">
                            Titolo: <span className="text-neutral-200">{row.latestRequest.title}</span>
                          </p>
                          <p className="mt-1">
                            Importo: <span className="text-neutral-200">{formatCurrency(row.latestRequest.amount.toString())}</span>
                          </p>
                          <p className="mt-1">Creata il: {formatDate(row.latestRequest.createdAt)}</p>
                          {row.latestRequest.paidAt && (
                            <p className="mt-1">Segnata come pagata il: {formatDate(row.latestRequest.paidAt)}</p>
                          )}
                        </div>
                      )}

                      {row.latestPayment && (
                        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
                          <p className="font-medium text-neutral-200">Ultimo incasso registrato</p>
                          <p className="mt-2">
                            Metodo: <span className="text-neutral-200">{getPaymentProviderLabel(row.latestPayment.provider, row.latestPayment.providerRef)}</span>
                          </p>
                          <p className="mt-1">
                            Importo: <span className="text-neutral-200">{formatCurrency(row.latestPayment.amount.toString())}</span>
                          </p>
                          <p className="mt-1">Data: {formatDate(row.latestPayment.paidAt || row.latestPayment.createdAt)}</p>
                        </div>
                      )}

                      {!hasMonthlyFee && (
                        <div className="mt-4 rounded-lg border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                          Prima di generare un link o registrare pagamenti, imposta la retta mensile nella scheda del bambino.
                        </div>
                      )}

                      {isAlreadyPaid && (
                        <div className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
                          Questa retta risulta già saldata. I pulsanti sono bloccati per evitare doppi incassi.
                        </div>
                      )}

                      {hasOpenRequest && (
                        <div className="mt-4 rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                          Esiste già una richiesta aperta. Puoi aprirla, condividerla o annullarla prima di registrare un nuovo pagamento.
                        </div>
                      )}

                      {!paymentsEnabled && (
                        <div className="mt-4 rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                          I pagamenti online non sono ancora attivi per questa struttura.
                        </div>
                      )}
                    </div>

                    <div className="xl:w-[430px]">
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="text-sm font-medium text-white">Pagamenti online</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <form action={generateMonthlyPaymentLink}>
                            <input type="hidden" name="childId" value={row.id} />
                            <button
                              type="submit"
                              disabled={!canGenerateLink}
                              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition enabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Genera link
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
                                  WhatsApp
                                </Link>
                              ) : null}

                              {canCancelRequest ? (
                                <form action={cancelPaymentRequest}>
                                  <input type="hidden" name="requestId" value={row.latestRequest!.id} />
                                  <button
                                    type="submit"
                                    className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/50"
                                  >
                                    Annulla richiesta
                                  </button>
                                </form>
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
                                WhatsApp
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="text-sm font-medium text-white">Pagamenti manuali</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <form action={registerManualPayment}>
                            <input type="hidden" name="childId" value={row.id} />
                            <input type="hidden" name="method" value="cash" />
                            <button
                              type="submit"
                              disabled={!canRegisterManual}
                              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition enabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Contanti
                            </button>
                          </form>

                          <form action={registerManualPayment}>
                            <input type="hidden" name="childId" value={row.id} />
                            <input type="hidden" name="method" value="bank_transfer" />
                            <button
                              type="submit"
                              disabled={!canRegisterManual}
                              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition enabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Bonifico
                            </button>
                          </form>

                          <form action={registerManualPayment}>
                            <input type="hidden" name="childId" value={row.id} />
                            <input type="hidden" name="method" value="pos" />
                            <button
                              type="submit"
                              disabled={!canRegisterManual}
                              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition enabled:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              POS
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
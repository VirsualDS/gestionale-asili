import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { startPublicPaymentCheckout } from "./actions";

export const dynamic = "force-dynamic";

type PublicPaymentPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function getPaymentRequestByToken(token: string) {
  return prisma.paymentRequest.findUnique({
    where: {
      publicToken: token,
    },
    include: {
      structure: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          paymentSetupStatus: true,
          stripeAccountId: true,
          stripeAccountStatus: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
          isActive: true,
        },
      },
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
}

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

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "In attesa di pagamento";
    case "checkout_created":
      return "Link di pagamento generato";
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

function getStatusClasses(status: string) {
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

function getPublicPageState(
  paymentRequest: Awaited<ReturnType<typeof getPaymentRequestByToken>>
) {
  if (!paymentRequest) {
    return "not-found";
  }

  if (!paymentRequest.structure.isActive) {
    return "structure-disabled";
  }

  if (paymentRequest.status === "paid") {
    return "paid";
  }

  if (paymentRequest.status === "cancelled") {
    return "cancelled";
  }

  if (paymentRequest.status === "expired") {
    return "expired";
  }

  if (paymentRequest.status === "overdue") {
    return "overdue";
  }

  return "ready";
}

export default async function PublicPaymentPage({
  params,
  searchParams,
}: PublicPaymentPageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const paymentRequest = await getPaymentRequestByToken(token);

  if (!paymentRequest) {
    notFound();
  }

  const childFullName =
    `${paymentRequest.child.firstName} ${paymentRequest.child.lastName}`.trim();
  const pageState = getPublicPageState(paymentRequest);
  const latestPayment = paymentRequest.payments[0] ?? null;

  const errorMessage = resolvedSearchParams?.error
    ? decodeURIComponent(resolvedSearchParams.error)
    : null;

  async function handleStartCheckout() {
    "use server";

    const result = await startPublicPaymentCheckout(token);

    if (!result.ok) {
      redirect(`/pay/${token}?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Pagamento online
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            {paymentRequest.structure.name}
          </h1>
          <p className="mt-3 text-neutral-400">
            Verifica i dettagli della richiesta di pagamento prima di procedere.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-neutral-500">Stato richiesta</p>
              <span
                className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                  paymentRequest.status
                )}`}
              >
                {getStatusLabel(paymentRequest.status)}
              </span>
            </div>

            <div className="text-right">
              <p className="text-sm text-neutral-500">Importo</p>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(paymentRequest.amount.toString())}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Causale</p>
              <p className="mt-2 font-medium text-white">
                {paymentRequest.title}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Bambino</p>
              <p className="mt-2 font-medium text-white">{childFullName}</p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Scadenza</p>
              <p className="mt-2 font-medium text-white">
                {formatDate(paymentRequest.dueDate)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Struttura</p>
              <p className="mt-2 font-medium text-white">
                {paymentRequest.structure.name}
              </p>
            </div>
          </div>

          {paymentRequest.description && (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Descrizione</p>
              <p className="mt-2 whitespace-pre-wrap text-neutral-200">
                {paymentRequest.description}
              </p>
            </div>
          )}

          {latestPayment && (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">
                Ultimo tentativo registrato
              </p>
              <p className="mt-2 text-neutral-200">
                Stato:{" "}
                <span className="font-medium text-white">
                  {latestPayment.status}
                </span>
              </p>
              <p className="mt-1 text-neutral-400">
                Data: {formatDate(latestPayment.createdAt)}
              </p>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            {pageState === "ready" && (
              <>
                <p className="text-lg font-semibold text-white">
                  Pagamento pronto
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  La richiesta è valida. Clicca qui sotto per accedere al checkout
                  sicuro e completare il pagamento.
                </p>
                <div className="mt-5">
                  <form action={handleStartCheckout}>
                    <button
                      type="submit"
                      className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200"
                    >
                      Paga ora
                    </button>
                  </form>
                </div>
              </>
            )}

            {pageState === "paid" && (
              <>
                <p className="text-lg font-semibold text-emerald-300">
                  Questa richiesta risulta già pagata
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Non è necessario effettuare un nuovo pagamento.
                </p>
              </>
            )}

            {pageState === "cancelled" && (
              <>
                <p className="text-lg font-semibold text-red-300">
                  Questa richiesta è stata annullata
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Contatta la struttura per eventuali chiarimenti.
                </p>
              </>
            )}

            {pageState === "expired" && (
              <>
                <p className="text-lg font-semibold text-red-300">
                  Il link di pagamento è scaduto
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Contatta la struttura per ricevere un nuovo link aggiornato.
                </p>
              </>
            )}

            {pageState === "overdue" && (
              <>
                <p className="text-lg font-semibold text-red-300">
                  La richiesta risulta scaduta
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Contatta la struttura per verificare se il pagamento è ancora
                  dovuto.
                </p>
              </>
            )}

            {pageState === "structure-disabled" && (
              <>
                <p className="text-lg font-semibold text-red-300">
                  Pagamento momentaneamente non disponibile
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  La struttura non è attualmente abilitata a ricevere pagamenti
                  online.
                </p>
              </>
            )}
          </div>
        </section>

        <div className="mt-6 text-center text-sm text-neutral-500">
          <p>Hai ricevuto questo link dalla struttura tramite canale diretto.</p>
          {paymentRequest.structure.email && (
            <p className="mt-1">
              Contatto struttura:{" "}
              <Link
                href={`mailto:${paymentRequest.structure.email}`}
                className="text-neutral-300 transition hover:text-white"
              >
                {paymentRequest.structure.email}
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
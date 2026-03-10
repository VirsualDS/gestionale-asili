import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PublicPaymentSuccessPageProps = {
  params: Promise<{
    token: string;
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
          name: true,
          email: true,
        },
      },
      child: {
        select: {
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

export default async function PublicPaymentSuccessPage({
  params,
}: PublicPaymentSuccessPageProps) {
  const { token } = await params;
  const paymentRequest = await getPaymentRequestByToken(token);

  if (!paymentRequest) {
    notFound();
  }

  const childFullName =
    `${paymentRequest.child.firstName} ${paymentRequest.child.lastName}`.trim();
  const latestPayment = paymentRequest.payments[0] ?? null;
  const isPaid = paymentRequest.status === "paid";

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-black/20">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Esito pagamento
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              {isPaid ? "Pagamento completato" : "Pagamento in verifica"}
            </h1>

            <p className="mt-3 text-neutral-400">
              {isPaid
                ? "La richiesta risulta pagata correttamente."
                : "Il ritorno da Stripe è avvenuto, ma il sistema sta ancora verificando lo stato definitivo del pagamento."}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Struttura</p>
              <p className="mt-2 font-medium text-white">
                {paymentRequest.structure.name}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Importo</p>
              <p className="mt-2 font-medium text-white">
                {formatCurrency(paymentRequest.amount.toString())}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Causale</p>
              <p className="mt-2 font-medium text-white">{paymentRequest.title}</p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm text-neutral-500">Bambino</p>
              <p className="mt-2 font-medium text-white">{childFullName}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-500">Stato richiesta</p>
            <p className="mt-2 font-medium text-white">{paymentRequest.status}</p>

            {paymentRequest.paidAt && (
              <p className="mt-2 text-sm text-neutral-400">
                Pagato il: {formatDate(paymentRequest.paidAt)}
              </p>
            )}

            {latestPayment && (
              <p className="mt-1 text-sm text-neutral-400">
                Ultimo stato pagamento registrato: {latestPayment.status}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/pay/${paymentRequest.publicToken}`}
              className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
            >
              Torna al riepilogo
            </Link>

            {paymentRequest.structure.email && (
              <Link
                href={`mailto:${paymentRequest.structure.email}`}
                className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                Contatta la struttura
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
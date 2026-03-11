import {
  formatCurrency,
  formatDate,
  getPaymentProviderClasses,
  getPaymentProviderLabel,
  getPaymentRequestStatusLabel,
} from "../_lib/child-detail-utils";

type PaymentHistoryItem = {
  id: string;
  amount: { toString(): string };
  status: string;
  provider?: string | null;
  providerRef?: string | null;
  paidAt?: Date | string | null;
  createdAt: Date | string;
  requestTitle: string;
  requestStatus: string;
};

type PaymentHistoryCardProps = {
  allPayments: PaymentHistoryItem[];
};

export function PaymentHistoryCard({
  allPayments,
}: PaymentHistoryCardProps) {
  return (
    <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">Storico incassi registrati</h2>

      {allPayments.length === 0 ? (
        <p className="text-neutral-400">Nessun incasso registrato.</p>
      ) : (
        <div className="space-y-3">
          {allPayments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{payment.requestTitle}</p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getPaymentProviderClasses(
                        payment.provider
                      )}`}
                    >
                      {getPaymentProviderLabel(
                        payment.provider,
                        payment.providerRef
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-neutral-500">
                    Stato richiesta collegata:{" "}
                    {getPaymentRequestStatusLabel(payment.requestStatus)}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Data incasso: {formatDate(payment.paidAt || payment.createdAt)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-white">
                    {formatCurrency(payment.amount.toString())}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Stato pagamento: {payment.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
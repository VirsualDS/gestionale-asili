import {
  formatCurrency,
  formatDate,
  getPaymentProviderClasses,
  getPaymentProviderLabel,
  getPaymentRequestStatusClasses,
  getPaymentRequestStatusLabel,
} from "../_lib/child-detail-utils";

type PaymentRequestPaymentItem = {
  id: string;
  provider?: string | null;
  providerRef?: string | null;
};

type PaymentRequestListItem = {
  id: string;
  title: string;
  type: string;
  amount: { toString(): string };
  status: string;
  createdAt: Date | string;
  paidAt?: Date | string | null;
  payments: PaymentRequestPaymentItem[];
};

type PaymentRequestsCardProps = {
  paymentRequests: PaymentRequestListItem[];
};

export function PaymentRequestsCard({
  paymentRequests,
}: PaymentRequestsCardProps) {
  return (
    <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">Ultime richieste di pagamento</h2>

      {paymentRequests.length === 0 ? (
        <p className="text-neutral-400">Nessuna richiesta presente.</p>
      ) : (
        <div className="space-y-3">
          {paymentRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{request.title}</p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getPaymentRequestStatusClasses(
                        request.status
                      )}`}
                    >
                      {getPaymentRequestStatusLabel(request.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-neutral-500">
                    Tipo: {request.type} · Creata il {formatDate(request.createdAt)}
                  </p>

                  {request.paidAt && (
                    <p className="mt-1 text-sm text-neutral-500">
                      Pagata il: {formatDate(request.paidAt)}
                    </p>
                  )}

                  {request.payments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.payments.map((payment) => (
                        <span
                          key={payment.id}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getPaymentProviderClasses(
                            payment.provider
                          )}`}
                        >
                          {getPaymentProviderLabel(
                            payment.provider,
                            payment.providerRef
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-semibold text-white">
                    {formatCurrency(request.amount.toString())}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Pagamenti collegati: {request.payments.length}
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
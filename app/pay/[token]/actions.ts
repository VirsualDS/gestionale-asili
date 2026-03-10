"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  calculateApplicationFeeAmount,
  getBaseUrl,
  stripe,
  toStripeAmount,
} from "@/lib/stripe";

type StartCheckoutResult =
  | { ok: true }
  | { ok: false; error: string };

export async function startPublicPaymentCheckout(
  token: string
): Promise<StartCheckoutResult> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      ok: false,
      error: "Token pagamento non valido.",
    };
  }

  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: {
      publicToken: normalizedToken,
    },
    include: {
      structure: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          paymentSetupStatus: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
        },
      },
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!paymentRequest) {
    return {
      ok: false,
      error: "Richiesta di pagamento non trovata.",
    };
  }

  if (!paymentRequest.structure.isActive) {
    return {
      ok: false,
      error: "La struttura non è attualmente attiva.",
    };
  }

  if (paymentRequest.structure.paymentSetupStatus !== "enabled") {
    return {
      ok: false,
      error: "La struttura non è abilitata ai pagamenti online.",
    };
  }

  if (
    !paymentRequest.structure.stripeAccountId ||
    !paymentRequest.structure.stripeChargesEnabled ||
    !paymentRequest.structure.stripePayoutsEnabled ||
    !paymentRequest.structure.stripeDetailsSubmitted
  ) {
    return {
      ok: false,
      error: "L'account Stripe della struttura non è pronto a ricevere pagamenti.",
    };
  }

  if (paymentRequest.status === "paid") {
    return {
      ok: false,
      error: "Questa richiesta risulta già pagata.",
    };
  }

  if (
    paymentRequest.status === "cancelled" ||
    paymentRequest.status === "expired" ||
    paymentRequest.status === "overdue"
  ) {
    return {
      ok: false,
      error: "Questa richiesta non è più pagabile online.",
    };
  }

  const amountInCents = toStripeAmount(paymentRequest.amount.toString());
  const applicationFeeAmount = calculateApplicationFeeAmount(amountInCents, 1);
  const baseUrl = getBaseUrl();
  const childFullName =
    `${paymentRequest.child.firstName} ${paymentRequest.child.lastName}`.trim();
  const destinationAccountId = paymentRequest.structure.stripeAccountId;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${baseUrl}/pay/${paymentRequest.publicToken}/success`,
    cancel_url: `${baseUrl}/pay/${paymentRequest.publicToken}/cancel`,
    payment_method_types: ["card"],
    customer_email: paymentRequest.structure.email || undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amountInCents,
          product_data: {
            name: paymentRequest.title,
            description: childFullName
              ? `Pagamento per ${childFullName}`
              : undefined,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      paymentRequestId: paymentRequest.id,
      structureId: paymentRequest.structure.id,
      childId: paymentRequest.child.id,
      publicToken: paymentRequest.publicToken,
    },
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      on_behalf_of: destinationAccountId,
      transfer_data: {
        destination: destinationAccountId,
      },
      metadata: {
        paymentRequestId: paymentRequest.id,
        structureId: paymentRequest.structure.id,
        childId: paymentRequest.child.id,
        publicToken: paymentRequest.publicToken,
      },
    },
  });

  await prisma.paymentRequest.update({
    where: {
      id: paymentRequest.id,
    },
    data: {
      status: "checkout_created",
      publicLink: `${baseUrl}/pay/${paymentRequest.publicToken}`,
      stripeCheckoutSessionId: session.id,
      stripeCheckoutUrl: session.url,
      stripeCheckoutExpiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : null,
      lastPaymentAttemptAt: new Date(),
    },
  });

  const existingPayment = await prisma.payment.findFirst({
    where: {
      paymentRequestId: paymentRequest.id,
      status: "pending",
    },
    select: {
      id: true,
    },
  });

  if (existingPayment) {
    await prisma.payment.update({
      where: {
        id: existingPayment.id,
      },
      data: {
        amount: paymentRequest.amount,
        grossAmount: paymentRequest.amount,
        applicationFeeAmount: Number((applicationFeeAmount / 100).toFixed(2)),
        netAmountToStructure: Number(
          ((amountInCents - applicationFeeAmount) / 100).toFixed(2)
        ),
        currency: "eur",
        provider: "stripe",
        providerRef: session.id,
        stripeCheckoutSessionId: session.id,
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        structureId: paymentRequest.structure.id,
        paymentRequestId: paymentRequest.id,
        amount: paymentRequest.amount,
        grossAmount: paymentRequest.amount,
        applicationFeeAmount: Number((applicationFeeAmount / 100).toFixed(2)),
        netAmountToStructure: Number(
          ((amountInCents - applicationFeeAmount) / 100).toFixed(2)
        ),
        currency: "eur",
        status: "pending",
        provider: "stripe",
        providerRef: session.id,
        stripeCheckoutSessionId: session.id,
      },
    });
  }

  if (!session.url) {
    return {
      ok: false,
      error: "Stripe non ha restituito un URL di checkout valido.",
    };
  }

  redirect(session.url);
}
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, stripeWebhookSecret } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function getStripeSignature(request: Request) {
  return request.headers.get("stripe-signature");
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const paymentRequestId = session.metadata?.paymentRequestId;
  const publicToken = session.metadata?.publicToken;
  const stripeCheckoutSessionId = session.id;
  const stripePaymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentRequestId || !publicToken || !stripeCheckoutSessionId) {
    return;
  }

  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: {
      id: paymentRequestId,
    },
    select: {
      id: true,
      structureId: true,
      status: true,
      amount: true,
    },
  });

  if (!paymentRequest) {
    return;
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      paymentRequestId: paymentRequest.id,
      stripeCheckoutSessionId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  await prisma.paymentRequest.update({
    where: {
      id: paymentRequest.id,
    },
    data: {
      status: "paid",
      paidAt: new Date(),
    },
  });

  if (existingPayment) {
    await prisma.payment.update({
      where: {
        id: existingPayment.id,
      },
      data: {
        status: "paid",
        providerRef: stripeCheckoutSessionId,
        stripePaymentIntentId: stripePaymentIntentId || undefined,
        paidAt: new Date(),
      },
    });

    return;
  }

  await prisma.payment.create({
    data: {
      structureId: paymentRequest.structureId,
      paymentRequestId: paymentRequest.id,
      amount: paymentRequest.amount,
      grossAmount: paymentRequest.amount,
      currency: "eur",
      status: "paid",
      provider: "stripe",
      providerRef: stripeCheckoutSessionId,
      stripeCheckoutSessionId,
      stripePaymentIntentId: stripePaymentIntentId || undefined,
      paidAt: new Date(),
    },
  });
}

async function handleCheckoutSessionExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const paymentRequestId = session.metadata?.paymentRequestId;
  const stripeCheckoutSessionId = session.id;

  if (!paymentRequestId || !stripeCheckoutSessionId) {
    return;
  }

  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: {
      id: paymentRequestId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!paymentRequest) {
    return;
  }

  if (paymentRequest.status !== "paid" && paymentRequest.status !== "cancelled") {
    await prisma.paymentRequest.update({
      where: {
        id: paymentRequest.id,
      },
      data: {
        status: "expired",
      },
    });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      paymentRequestId: paymentRequest.id,
      stripeCheckoutSessionId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!payment) {
    return;
  }

  if (payment.status !== "paid" && payment.status !== "refunded") {
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "failed",
      },
    });
  }
}

export async function POST(request: Request) {
  const signature = getStripeSignature(request);

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook signature verification failed";

    return new Response(message, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event);
        break;

      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";

    return new Response(message, { status: 500 });
  }
}
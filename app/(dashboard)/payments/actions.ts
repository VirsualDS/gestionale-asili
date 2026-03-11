"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStructureSession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/stripe";

function getCurrentMonthLabel() {
  const now = new Date();

  return now.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}

async function getValidatedChildForPayments(childId: string, structureId: string) {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId,
    },
    select: {
      id: true,
      structureId: true,
      firstName: true,
      lastName: true,
      monthlyFee: true,
      status: true,
      structure: {
        select: {
          id: true,
          paymentSetupStatus: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
        },
      },
    },
  });

  return child;
}

function getMonthlyPaymentTitle(child: {
  firstName: string;
  lastName: string;
}) {
  const monthLabel = getCurrentMonthLabel();
  return `Retta mensile ${monthLabel} - ${child.firstName} ${child.lastName}`.trim();
}

export async function generateMonthlyPaymentLink(formData: FormData) {
  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();

  if (!childId) {
    redirect("/payments?error=invalid-child");
  }

  const child = await getValidatedChildForPayments(childId, session.structureId);

  if (!child) {
    redirect("/payments?error=child-not-found");
  }

  if (child.status !== "active") {
    redirect("/payments?error=child-not-active");
  }

  if (!child.monthlyFee) {
    redirect("/payments?error=missing-monthly-fee");
  }

  const structureReadyForPayments =
    child.structure.paymentSetupStatus === "enabled" &&
    !!child.structure.stripeAccountId &&
    child.structure.stripeChargesEnabled &&
    child.structure.stripePayoutsEnabled &&
    child.structure.stripeDetailsSubmitted;

  if (!structureReadyForPayments) {
    redirect("/payments?error=payments-not-enabled");
  }

  const title = getMonthlyPaymentTitle(child);

  const existingRequest = await prisma.paymentRequest.findFirst({
    where: {
      structureId: child.structureId,
      childId: child.id,
      type: "monthly_fee",
      title,
      status: {
        in: ["pending", "checkout_created"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      publicToken: true,
      publicLink: true,
    },
  });

  const baseUrl = getBaseUrl();

  if (existingRequest) {
    const publicLink =
      existingRequest.publicLink || `${baseUrl}/pay/${existingRequest.publicToken}`;

    await prisma.paymentRequest.update({
      where: {
        id: existingRequest.id,
      },
      data: {
        publicLink,
      },
    });

    redirect("/payments?success=link-ready");
  }

  const createdRequest = await prisma.paymentRequest.create({
    data: {
      structureId: child.structureId,
      childId: child.id,
      type: "monthly_fee",
      title,
      amount: child.monthlyFee,
      status: "pending",
    },
    select: {
      id: true,
      publicToken: true,
    },
  });

  await prisma.paymentRequest.update({
    where: {
      id: createdRequest.id,
    },
    data: {
      publicLink: `${baseUrl}/pay/${createdRequest.publicToken}`,
    },
  });

  redirect("/payments?success=link-generated");
}

export async function registerManualPayment(formData: FormData) {
  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();
  const method = String(formData.get("method") || "").trim().toLowerCase();

  if (!childId) {
    redirect("/payments?error=invalid-child");
  }

  if (!["cash", "bank_transfer", "pos"].includes(method)) {
    redirect("/payments?error=invalid-manual-method");
  }

  const child = await getValidatedChildForPayments(childId, session.structureId);

  if (!child) {
    redirect("/payments?error=child-not-found");
  }

  if (child.status !== "active") {
    redirect("/payments?error=child-not-active");
  }

  if (!child.monthlyFee) {
    redirect("/payments?error=missing-monthly-fee");
  }

  const title = getMonthlyPaymentTitle(child);
  const paidAt = new Date();

  const existingOpenRequest = await prisma.paymentRequest.findFirst({
    where: {
      structureId: child.structureId,
      childId: child.id,
      type: "monthly_fee",
      title,
      status: {
        in: ["pending", "checkout_created"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      publicToken: true,
      publicLink: true,
    },
  });

  let paymentRequestId: string;

  if (existingOpenRequest) {
    paymentRequestId = existingOpenRequest.id;

    await prisma.paymentRequest.update({
      where: {
        id: existingOpenRequest.id,
      },
      data: {
        status: "paid",
        paidAt,
      },
    });
  } else {
    const baseUrl = getBaseUrl();

    const createdRequest = await prisma.paymentRequest.create({
      data: {
        structureId: child.structureId,
        childId: child.id,
        type: "monthly_fee",
        title,
        amount: child.monthlyFee,
        status: "paid",
        paidAt,
      },
      select: {
        id: true,
        publicToken: true,
      },
    });

    paymentRequestId = createdRequest.id;

    await prisma.paymentRequest.update({
      where: {
        id: createdRequest.id,
      },
      data: {
        publicLink: `${baseUrl}/pay/${createdRequest.publicToken}`,
      },
    });
  }

  await prisma.payment.create({
    data: {
      structureId: child.structureId,
      paymentRequestId,
      amount: child.monthlyFee,
      grossAmount: child.monthlyFee,
      applicationFeeAmount: 0,
      netAmountToStructure: child.monthlyFee,
      currency: "eur",
      status: "paid",
      provider: "manual",
      providerRef: method,
      paidAt,
    },
  });

  redirect("/payments?success=manual-payment-registered");
}

export async function cancelPaymentRequest(formData: FormData) {
  const session = await requireStructureSession();

  const requestId = String(formData.get("requestId") || "").trim();

  if (!requestId) {
    redirect("/payments?error=invalid-request");
  }

  const paymentRequest = await prisma.paymentRequest.findFirst({
    where: {
      id: requestId,
      structureId: session.structureId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!paymentRequest) {
    redirect("/payments?error=request-not-found");
  }

  if (!["pending", "checkout_created"].includes(paymentRequest.status)) {
    redirect("/payments?error=request-not-cancellable");
  }

  await prisma.paymentRequest.update({
    where: {
      id: paymentRequest.id,
    },
    data: {
      status: "cancelled",
    },
  });

  await prisma.payment.updateMany({
    where: {
      paymentRequestId: paymentRequest.id,
      status: "pending",
    },
    data: {
      status: "failed",
    },
  });

  redirect("/payments?success=request-cancelled");
}
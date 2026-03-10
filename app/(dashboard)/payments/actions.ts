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

export async function generateMonthlyPaymentLink(formData: FormData) {
  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();

  if (!childId) {
    redirect("/payments?error=invalid-child");
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId: session.structureId,
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

  const monthLabel = getCurrentMonthLabel();
  const title = `Retta mensile ${monthLabel} - ${child.firstName} ${child.lastName}`.trim();

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
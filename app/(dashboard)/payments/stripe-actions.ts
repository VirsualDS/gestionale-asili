"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStructureSession } from "@/lib/auth";
import { getBaseUrl, stripe } from "@/lib/stripe";

function getStripeAccountStatus(params: {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}) {
  const { chargesEnabled, payoutsEnabled, detailsSubmitted } = params;

  if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
    return "active";
  }

  if (detailsSubmitted) {
    return "pending";
  }

  return "pending";
}

export async function startStructureStripeOnboardingFromDashboard() {
  const session = await requireStructureSession();

  const structure = await prisma.structure.findUnique({
    where: {
      id: session.structureId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      stripeAccountId: true,
    },
  });

  if (!structure) {
    redirect("/payments?error=structure-not-found");
  }

  let stripeAccountId = structure.stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "IT",
      email: structure.email || undefined,
      business_profile: {
        name: structure.name,
      },
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      metadata: {
        structureId: structure.id,
      },
    });

    stripeAccountId = account.id;

    await prisma.structure.update({
      where: {
        id: structure.id,
      },
      data: {
        stripeAccountId,
        stripeAccountStatus: "pending",
        stripeOnboardingStartedAt: new Date(),
        paymentSetupStatus: "pending",
      },
    });
  }

  const baseUrl = getBaseUrl();

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${baseUrl}/payments?error=stripe-onboarding-refresh`,
    return_url: `${baseUrl}/payments?success=stripe-onboarding-return`,
  });

  redirect(accountLink.url);
}

export async function refreshStructureStripeStatusFromDashboard() {
  const session = await requireStructureSession();

  const structure = await prisma.structure.findUnique({
    where: {
      id: session.structureId,
    },
    select: {
      id: true,
      stripeAccountId: true,
    },
  });

  if (!structure) {
    redirect("/payments?error=structure-not-found");
  }

  if (!structure.stripeAccountId) {
    redirect("/payments?error=stripe-account-missing");
  }

  const account = await stripe.accounts.retrieve(structure.stripeAccountId);

  const stripeAccountStatus = getStripeAccountStatus({
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });

  const paymentSetupStatus =
    account.charges_enabled && account.payouts_enabled && account.details_submitted
      ? "enabled"
      : "pending";

  await prisma.structure.update({
    where: {
      id: structure.id,
    },
    data: {
      stripeAccountStatus,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeDetailsSubmitted: account.details_submitted,
      stripeOnboardingCompletedAt:
        account.details_submitted && account.charges_enabled && account.payouts_enabled
          ? new Date()
          : null,
      paymentSetupStatus,
    },
  });

  redirect("/payments?success=stripe-status-refreshed");
}
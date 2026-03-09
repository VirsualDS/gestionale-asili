"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/lib/auth";
import { PaymentSetupStatus } from "@prisma/client";

function isValidPaymentSetupStatus(value: string): value is PaymentSetupStatus {
  return (
    value === "not_configured" ||
    value === "pending" ||
    value === "enabled" ||
    value === "blocked"
  );
}

export async function updateStructurePaymentSetupStatus(formData: FormData) {
  await requirePlatformSession();

  const structureId = String(formData.get("structureId") || "").trim();
  const paymentSetupStatus = String(formData.get("paymentSetupStatus") || "").trim();

  if (!structureId) {
    redirect("/platform/structures?error=invalid-structure");
  }

  if (!isValidPaymentSetupStatus(paymentSetupStatus)) {
    redirect(`/platform/structures/${structureId}?error=invalid-payment-setup-status`);
  }

  const structure = await prisma.structure.findUnique({
    where: {
      id: structureId,
    },
    select: {
      id: true,
    },
  });

  if (!structure) {
    redirect("/platform/structures?error=not-found");
  }

  await prisma.structure.update({
    where: {
      id: structure.id,
    },
    data: {
      paymentSetupStatus,
    },
  });

  redirect(`/platform/structures/${structure.id}?success=payment-setup-status-updated`);
}

export async function toggleStructureUserStatus(formData: FormData) {
  await requirePlatformSession();

  const structureId = String(formData.get("structureId") || "").trim();
  const userId = String(formData.get("userId") || "").trim();

  if (!structureId) {
    redirect("/platform/structures?error=invalid-structure");
  }

  if (!userId) {
    redirect(`/platform/structures/${structureId}?error=invalid-user`);
  }

  const user = await prisma.structureUser.findFirst({
    where: {
      id: userId,
      structureId,
    },
    select: {
      id: true,
      isActive: true,
      structureId: true,
    },
  });

  if (!user) {
    redirect(`/platform/structures/${structureId}?error=user-not-found`);
  }

  await prisma.structureUser.update({
    where: {
      id: user.id,
    },
    data: {
      isActive: !user.isActive,
    },
  });

  redirect(`/platform/structures/${user.structureId}?success=user-status-updated`);
}
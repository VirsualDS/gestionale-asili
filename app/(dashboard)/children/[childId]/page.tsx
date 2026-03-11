import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStructureSession } from "@/lib/auth";
import { ChildAlerts } from "./_components/ChildAlerts";
import { ChildHeader } from "./_components/ChildHeader";
import { ChildMainDetailsCard } from "./_components/ChildMainDetailsCard";
import { ChildStatsCards } from "./_components/ChildStatsCards";
import { GuardianFormCard } from "./_components/GuardianFormCard";
import { GuardiansListCard } from "./_components/GuardiansListCard";
import { PaymentHistoryCard } from "./_components/PaymentHistoryCard";
import { PaymentRequestsCard } from "./_components/PaymentRequestsCard";
import { PickupFormCard } from "./_components/PickupFormCard";
import { PickupPeopleListCard } from "./_components/PickupPeopleListCard";

export const dynamic = "force-dynamic";

type ChildDetailPageProps = {
  params: Promise<{
    childId: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

async function getChildDetail(structureId: string, childId: string) {
  return prisma.child.findFirst({
    where: {
      id: childId,
      structureId,
    },
    include: {
      classRoom: true,
      guardians: {
        orderBy: [{ isPrimaryContact: "desc" }, { firstName: "asc" }],
      },
      authorizedPickupPeople: {
        orderBy: [{ firstName: "asc" }],
      },
      paymentRequests: {
        orderBy: [{ createdAt: "desc" }],
        take: 10,
        include: {
          payments: {
            orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
          },
        },
      },
      _count: {
        select: {
          guardians: true,
          authorizedPickupPeople: true,
          paymentRequests: true,
        },
      },
    },
  });
}

async function addGuardian(formData: FormData) {
  "use server";

  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const relationship = String(formData.get("relationship") || "").trim();
  const isPrimaryContact = formData.get("isPrimaryContact") === "on";

  if (!childId || !firstName) {
    redirect(`/children/${childId}?error=guardian-missing`);
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId: session.structureId,
    },
  });

  if (!child) {
    redirect("/children?error=child-not-found");
  }

  if (isPrimaryContact) {
    await prisma.guardian.updateMany({
      where: {
        childId,
      },
      data: {
        isPrimaryContact: false,
      },
    });
  }

  await prisma.guardian.create({
    data: {
      structureId: session.structureId,
      childId,
      firstName,
      lastName: lastName || null,
      phone: phone || null,
      email: email || null,
      relationship: relationship || null,
      isPrimaryContact,
    },
  });

  redirect(`/children/${childId}?success=guardian-created`);
}

async function deleteGuardian(formData: FormData) {
  "use server";

  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();
  const guardianId = String(formData.get("guardianId") || "").trim();

  if (!childId || !guardianId) {
    redirect(`/children/${childId}?error=guardian-delete-invalid`);
  }

  const guardian = await prisma.guardian.findFirst({
    where: {
      id: guardianId,
      childId,
      structureId: session.structureId,
    },
  });

  if (!guardian) {
    redirect(`/children/${childId}?error=guardian-not-found`);
  }

  await prisma.guardian.delete({
    where: {
      id: guardian.id,
    },
  });

  redirect(`/children/${childId}?success=guardian-deleted`);
}

async function addAuthorizedPickupPerson(formData: FormData) {
  "use server";

  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!childId || !firstName) {
    redirect(`/children/${childId}?error=pickup-missing`);
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId: session.structureId,
    },
  });

  if (!child) {
    redirect("/children?error=child-not-found");
  }

  await prisma.authorizedPickupPerson.create({
    data: {
      childId,
      firstName,
      lastName: lastName || null,
      phone: phone || null,
      note: note || null,
    },
  });

  redirect(`/children/${childId}?success=pickup-created`);
}

async function deleteAuthorizedPickupPerson(formData: FormData) {
  "use server";

  const session = await requireStructureSession();

  const childId = String(formData.get("childId") || "").trim();
  const personId = String(formData.get("personId") || "").trim();

  if (!childId || !personId) {
    redirect(`/children/${childId}?error=pickup-delete-invalid`);
  }

  const person = await prisma.authorizedPickupPerson.findFirst({
    where: {
      id: personId,
      childId,
      child: {
        structureId: session.structureId,
      },
    },
  });

  if (!person) {
    redirect(`/children/${childId}?error=pickup-not-found`);
  }

  await prisma.authorizedPickupPerson.delete({
    where: {
      id: person.id,
    },
  });

  redirect(`/children/${childId}?success=pickup-deleted`);
}

async function deleteChild(formData: FormData) {
  "use server";

  const session = await requireStructureSession();
  const childId = String(formData.get("childId") || "").trim();

  if (!childId) {
    redirect("/children?error=invalid-child");
  }

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      structureId: session.structureId,
    },
    include: {
      _count: {
        select: {
          paymentRequests: true,
        },
      },
    },
  });

  if (!child) {
    redirect("/children?error=not-found");
  }

  if (child._count.paymentRequests > 0) {
    redirect(`/children/${childId}?error=child-has-payments`);
  }

  await prisma.guardian.deleteMany({
    where: {
      childId,
      structureId: session.structureId,
    },
  });

  await prisma.authorizedPickupPerson.deleteMany({
    where: {
      childId,
    },
  });

  await prisma.child.delete({
    where: {
      id: childId,
    },
  });

  redirect("/children?success=deleted");
}

export default async function ChildDetailPage({
  params,
  searchParams,
}: ChildDetailPageProps) {
  const session = await requireStructureSession();
  const { childId } = await params;
  const qs = searchParams ? await searchParams : undefined;

  const child = await getChildDetail(session.structureId, childId);

  if (!child) {
    notFound();
  }

  let successMessage: string | null = null;
  let errorMessage: string | null = null;

  if (qs?.success === "created") {
    successMessage = "Bambino creato correttamente.";
  } else if (qs?.success === "guardian-created") {
    successMessage = "Tutore aggiunto correttamente.";
  } else if (qs?.success === "guardian-deleted") {
    successMessage = "Tutore eliminato correttamente.";
  } else if (qs?.success === "pickup-created") {
    successMessage = "Persona autorizzata aggiunta correttamente.";
  } else if (qs?.success === "pickup-deleted") {
    successMessage = "Persona autorizzata eliminata correttamente.";
  }

  if (qs?.error === "guardian-missing") {
    errorMessage = "Per aggiungere un tutore serve almeno il nome.";
  } else if (qs?.error === "pickup-missing") {
    errorMessage = "Per aggiungere una persona autorizzata serve almeno il nome.";
  } else if (qs?.error === "guardian-delete-invalid") {
    errorMessage = "Richiesta eliminazione tutore non valida.";
  } else if (qs?.error === "guardian-not-found") {
    errorMessage = "Tutore non trovato.";
  } else if (qs?.error === "pickup-delete-invalid") {
    errorMessage = "Richiesta eliminazione autorizzato non valida.";
  } else if (qs?.error === "pickup-not-found") {
    errorMessage = "Persona autorizzata non trovata.";
  } else if (qs?.error === "child-has-payments") {
    errorMessage =
      "Non puoi eliminare il bambino perché ha richieste di pagamento collegate.";
  }

  const allPayments = child.paymentRequests
    .flatMap((request) =>
      request.payments.map((payment) => ({
        ...payment,
        requestTitle: request.title,
        requestStatus: request.status,
      }))
    )
    .sort((a, b) => {
      const aTime = new Date(a.paidAt || a.createdAt).getTime();
      const bTime = new Date(b.paidAt || b.createdAt).getTime();
      return bTime - aTime;
    });

  return (
    <div>
      <ChildHeader
        childId={child.id}
        fullName={`${child.firstName} ${child.lastName}`}
        classRoomName={child.classRoom.name}
        deleteChildAction={deleteChild}
      />

      <ChildAlerts
        successMessage={successMessage}
        errorMessage={errorMessage}
      />

      <ChildStatsCards
        status={child.status}
        monthlyFee={child.monthlyFee ? child.monthlyFee.toString() : null}
        guardiansCount={child.guardians.length}
        authorizedCount={child.authorizedPickupPeople.length}
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <ChildMainDetailsCard
          firstName={child.firstName}
          lastName={child.lastName}
          birthDate={child.birthDate}
          attendanceSchedule={child.attendanceSchedule}
          residence={child.residence}
          allergiesNotes={child.allergiesNotes}
          generalNotes={child.generalNotes}
        />

        <section className="space-y-6">
          <GuardianFormCard
            childId={child.id}
            addGuardianAction={addGuardian}
          />

          <PickupFormCard
            childId={child.id}
            addAuthorizedPickupPersonAction={addAuthorizedPickupPerson}
          />
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GuardiansListCard
          childId={child.id}
          guardians={child.guardians}
          deleteGuardianAction={deleteGuardian}
        />

        <PickupPeopleListCard
          childId={child.id}
          people={child.authorizedPickupPeople}
          deleteAuthorizedPickupPersonAction={deleteAuthorizedPickupPerson}
        />
      </div>

      <PaymentRequestsCard paymentRequests={child.paymentRequests} />

      <PaymentHistoryCard allPayments={allPayments} />
    </div>
  );
}
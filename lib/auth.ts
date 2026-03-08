import "dotenv/config";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "gestionale_asili_session";
const SESSION_DURATION_DAYS = 7;

type BaseSessionPayload = {
  userId: string;
  email: string;
  role: string;
};

type PlatformSessionPayload = BaseSessionPayload & {
  userType: "platform";
  structureId: null;
};

type StructureSessionPayload = BaseSessionPayload & {
  userType: "structure";
  structureId: string;
};

type SessionPayload = PlatformSessionPayload | StructureSessionPayload;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET non trovata nelle variabili ambiente.");
  }

  return new TextEncoder().encode(secret);
}

function isValidSessionPayload(payload: unknown): payload is SessionPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const p = payload as Record<string, unknown>;

  if (
    typeof p.userId !== "string" ||
    typeof p.email !== "string" ||
    typeof p.role !== "string"
  ) {
    return false;
  }

  if (p.userType === "platform") {
    return p.structureId === null;
  }

  if (p.userType === "structure") {
    return typeof p.structureId === "string" && p.structureId.length > 0;
  }

  return false;
}

async function signSessionToken(payload: SessionPayload) {
  const secret = getAuthSecret();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(secret);
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const secret = getAuthSecret();

  try {
    const { payload } = await jwtVerify(token, secret);

    if (!isValidSessionPayload(payload)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getDefaultRedirectPath(session: SessionPayload) {
  return session.userType === "platform" ? "/platform/dashboard" : "/dashboard";
}

export async function loginWithCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const platformUser = await prisma.platformUser.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (platformUser && platformUser.isActive) {
    const passwordIsValid = await bcrypt.compare(password, platformUser.passwordHash);

    if (passwordIsValid) {
      const token = await signSessionToken({
        userId: platformUser.id,
        email: platformUser.email,
        role: platformUser.role,
        userType: "platform",
        structureId: null,
      });

      const cookieStore = await cookies();

      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      });

      return {
        success: true as const,
        redirectTo: "/platform/dashboard",
      };
    }
  }

  const structureUser = await prisma.structureUser.findUnique({
    where: {
      email: normalizedEmail,
    },
    include: {
      structure: true,
    },
  });

  if (!structureUser || !structureUser.isActive || !structureUser.structure.isActive) {
    return {
      success: false as const,
      error: "Credenziali non valide.",
    };
  }

  const passwordIsValid = await bcrypt.compare(password, structureUser.passwordHash);

  if (!passwordIsValid) {
    return {
      success: false as const,
      error: "Credenziali non valide.",
    };
  }

  const token = await signSessionToken({
    userId: structureUser.id,
    email: structureUser.email,
    role: structureUser.role,
    userType: "structure",
    structureId: structureUser.structureId,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });

  return {
    success: true as const,
    redirectTo: "/dashboard",
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireStructureSession(): Promise<StructureSessionPayload> {
  const session = await requireSession();

  if (session.userType === "platform") {
    redirect("/platform/dashboard");
  }

  return session;
}

export async function requirePlatformSession(): Promise<PlatformSessionPayload> {
  const session = await requireSession();

  if (session.userType === "structure") {
    redirect("/dashboard");
  }

  return session;
}

export async function getSessionRedirectPath() {
  const session = await getSession();

  if (!session) {
    return "/login";
  }

  return getDefaultRedirectPath(session);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
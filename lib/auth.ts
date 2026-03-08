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

async function signSessionToken(payload: SessionPayload) {
  const secret = getAuthSecret();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(secret);
}

async function verifySessionToken(token: string): Promise<SessionPayload> {
  const secret = getAuthSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as SessionPayload;
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

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
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

  if (session.userType !== "structure") {
    redirect("/platform/dashboard");
  }

  return session;
}

export async function requirePlatformSession(): Promise<PlatformSessionPayload> {
  const session = await requireSession();

  if (session.userType !== "platform") {
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
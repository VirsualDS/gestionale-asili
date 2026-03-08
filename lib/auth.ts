import "dotenv/config";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "gestionale_asili_session";
const SESSION_DURATION_DAYS = 7;

type SessionPayload = {
  userId: string;
  structureId: string;
  email: string;
  role: string;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET non trovata nelle variabili ambiente.");
  }

  return new TextEncoder().encode(secret);
}

async function signSessionToken(payload: SessionPayload) {
  const secret = getAuthSecret();

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(secret);
}

async function verifySessionToken(token: string) {
  const secret = getAuthSecret();

  const { payload } = await jwtVerify(token, secret);

  return payload as unknown as SessionPayload;
}

export async function loginWithCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.structureUser.findUnique({
    where: {
      email: normalizedEmail,
    },
    include: {
      structure: true,
    },
  });

  if (!user || !user.isActive || !user.structure.isActive) {
    return {
      success: false,
      error: "Credenziali non valide.",
    };
  }

  if (user.structure.accountStatus !== "active" && user.structure.accountStatus !== "trial") {
    return {
      success: false,
      error: "Account struttura non attivo.",
    };
  }

  const passwordIsValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordIsValid) {
    return {
      success: false,
      error: "Credenziali non valide.",
    };
  }

  const token = await signSessionToken({
    userId: user.id,
    structureId: user.structureId,
    email: user.email,
    role: user.role,
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
    success: true,
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);

    return payload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
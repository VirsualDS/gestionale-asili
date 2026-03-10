import Stripe from "stripe";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const stripeSecretKey = getRequiredEnv("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SECRET");
export const stripePublishableKey = getRequiredEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

export function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl) {
    return appUrl.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}

export function toStripeAmount(amount: string | number) {
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid amount for Stripe conversion.");
  }

  return Math.round(numericAmount * 100);
}

export function calculateApplicationFeeAmount(
  amountInCents: number,
  feePercentage = 1
) {
  if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
    throw new Error("Invalid amount in cents for fee calculation.");
  }

  if (feePercentage < 0) {
    throw new Error("Fee percentage cannot be negative.");
  }

  return Math.round((amountInCents * feePercentage) / 100);
}
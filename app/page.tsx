import { redirect } from "next/navigation";
import { getSessionRedirectPath } from "@/lib/auth";

export default async function HomePage() {
  const redirectPath = await getSessionRedirectPath();
  redirect(redirectPath);
}
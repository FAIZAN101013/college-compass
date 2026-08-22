import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free account to save colleges and comparisons.",
};

export default async function SignupPage() {
  if (await getSession()) redirect("/saved");

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">
        Free, and takes a few seconds. No email verification for this demo.
      </p>

      <AuthForm mode="signup" />
    </div>
  );
}

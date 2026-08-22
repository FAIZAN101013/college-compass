"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema, signupSchema } from "@/lib/query/auth-schemas";

/**
 * The sign-in and sign-up form.
 *
 * One component for both, because the two differ by exactly one field and a
 * URL. Two near-identical components would drift — a validation rule or an
 * error style gets fixed in one and forgotten in the other.
 *
 * It validates with the SAME Zod schemas the API uses. That is the point of
 * keeping those schemas free of server imports: the client cannot permit
 * something the server will reject. The client check is only for immediate
 * feedback — the server revalidates every request, because anything running
 * in a browser can be bypassed with one devtools call.
 */

type Mode = "login" | "signup";

type FieldErrors = Record<string, string[]>;

export function AuthForm({ mode, redirectTo = "/saved" }: { mode: Mode; redirectTo?: string }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));

    // Clear this field's error as soon as the user edits it. Leaving a stale
    // error under a field someone is actively fixing reads as though their
    // correction did not register.
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const schema = isSignup ? signupSchema : loginSchema;
    const payload = isSignup ? values : { email: values.email, password: values.password };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_";
        (errors[key] ??= []).push(issue.message);
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        // The API returns the same { error: { message, fields } } envelope from
        // every route, so this one branch handles every failure shape.
        setFieldErrors(result.error?.fields ?? {});
        setFormError(result.error?.fields ? null : (result.error?.message ?? "Something went wrong."));
        return;
      }

      /**
       * router.refresh() before push.
       *
       * The session cookie is now set, but the header was rendered on the
       * server BEFORE that happened, so it still shows "Sign in". refresh()
       * re-runs the Server Components with the new cookie attached. Without
       * it the user lands on the next page still apparently signed out, and
       * only a manual reload fixes it.
       */
      router.refresh();
      router.push(redirectTo);
    } catch {
      // A thrown fetch means the request never completed — offline, DNS,
      // connection reset. Distinct from an error response, and worth its own
      // message so the user knows to check their connection rather than their
      // password.
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        // role="alert" makes a screen reader announce this the moment it
        // appears. Without it, a sighted user sees the error and everyone else
        // just experiences a form that did nothing.
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          {formError}
        </p>
      )}

      {isSignup && (
        <Field
          id="name"
          label="Your name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={(value) => update("name", value)}
          errors={fieldErrors.name}
        />
      )}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(value) => update("email", value)}
        errors={fieldErrors.email}
      />

      <Field
        id="password"
        label="Password"
        type="password"
        // Tells a password manager whether to offer an existing password or
        // generate a new one. Getting this wrong is why managers sometimes
        // fail to save a new account.
        autoComplete={isSignup ? "new-password" : "current-password"}
        value={values.password}
        onChange={(value) => update("password", value)}
        errors={fieldErrors.password}
        hint={isSignup ? "At least 8 characters. Longer beats complicated." : undefined}
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-text-secondary">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  errors,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  hint?: string;
}) {
  const hasError = Boolean(errors?.length);
  const describedBy = hasError ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // aria-invalid and aria-describedby wire the input to its error text,
        // so a screen reader announces "invalid, Email is required" on focus
        // instead of leaving the message stranded as unrelated nearby text.
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-lg border bg-surface-raised px-3 py-2.5 text-sm outline-none transition-colors ${
          hasError ? "border-red-400 focus:border-red-500" : "border-border-subtle focus:border-brand-500"
        }`}
      />

      {hasError ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {errors![0]}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

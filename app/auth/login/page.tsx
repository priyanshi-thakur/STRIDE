"use client";

import { useState } from "react";
import Link from "next/link";
import { signin } from "@/app/auth/actions";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  function clearMessages() {
    setServerMessage(null);
    setErrors({});
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    const nextErrors: FormErrors = {};
    let hasError = false;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Please enter a valid email address.";
      hasError = true;
    }
    if (!password) {
      nextErrors.password = "Please enter your password.";
      hasError = true;
    }

    if (hasError) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await signin(formData);
      if (result.success) {
        setServerMessage({ type: "success", text: result.message ?? "Logged in successfully." });
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Login failed." });
      }
    } catch {
      setServerMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stride-ivory text-stride-dark">
      <header className="flex items-center justify-between px-6 py-4 bg-stride-ivory">
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight text-stride-dark"
        >
          STRIDE
        </Link>
        <a
          href="/auth/signup"
          className="text-sm font-medium text-stride-sage hover:text-stride-olive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 rounded-full px-3 py-1"
        >
          Don&apos;t have an account? Sign up
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
              Log in to STRIDE
            </h1>
            <p className="mt-2 text-stride-dark/70 text-sm">
              Welcome back. Continue your innovation journey.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            {serverMessage && (
              <div
                role="alert"
                className={`rounded-lg p-4 text-sm ${
                  serverMessage.type === "success"
                    ? "bg-stride-butter/50 border border-stride-butter text-stride-dark/80"
                    : "bg-stride-dark/5 border border-stride-dark/20 text-stride-dark"
                }`}
              >
                {serverMessage.text}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-stride-dark">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                  errors.email ? "border-stride-dark/50" : "border-stride-stone"
                }`}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-stride-dark/60">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-stride-dark">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                  errors.password ? "border-stride-dark/50" : "border-stride-stone"
                }`}
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-stride-dark/60">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm py-3.5 transition-colors hover:bg-stride-dark disabled:bg-stride-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-stride-dark/60">
            Don&apos;t have an account?{" "}
            <a href="/auth/signup" className="text-stride-olive hover:text-stride-dark font-medium">
              Sign up
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

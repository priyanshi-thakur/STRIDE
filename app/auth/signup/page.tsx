"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/app/auth/actions";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SignUpPage() {
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
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const nextErrors: FormErrors = {};
    let hasError = false;

    if (!name) {
      nextErrors.name = "Please enter your full name.";
      hasError = true;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Please enter a valid email address.";
      hasError = true;
    }
    if (!password || password.length < 8) {
      nextErrors.password =
        "Password must be at least 8 characters long.";
      hasError = true;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      nextErrors.password =
        "Password must contain at least one letter and one number.";
      hasError = true;
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
      hasError = true;
    }

    if (hasError) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await signup(formData);
      if (result.success) {
        setServerMessage({ type: "success", text: result.message ?? "Account created successfully." });
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Sign-up failed." });
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
          href="/auth/login"
          className="text-sm font-medium text-stride-sage hover:text-stride-olive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 rounded-full px-3 py-1"
        >
          Already have an account? Log in
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
              Create your account
            </h1>
            <p className="mt-2 text-stride-dark/70 text-sm">
              Join STRIDE to save your projects and track your progress.
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
              <label htmlFor="name" className="block text-sm font-medium text-stride-dark">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                  errors.name ? "border-stride-dark/50" : "border-stride-stone"
                }`}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-stride-dark/60">
                  {errors.name}
                </p>
              )}
            </div>

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
                autoComplete="new-password"
                required
                minLength={8}
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
              <p className="text-xs text-stride-sage/80">
                At least 8 characters, with one letter and one number.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-stride-dark">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                  errors.confirmPassword ? "border-stride-dark/50" : "border-stride-stone"
                }`}
                aria-invalid={errors.confirmPassword ? "true" : "false"}
                aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirm-error" className="text-sm text-stride-dark/60">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm py-3.5 transition-colors hover:bg-stride-dark disabled:bg-stride-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-stride-dark/60">
            By creating an account you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}

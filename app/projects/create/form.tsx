"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createProject } from "@/app/projects/actions";

interface FormErrors {
  name?: string;
  problemStatement?: string;
  general?: string;
}

export default function CreateProjectForm() {
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const router = useRouter();

  function clearMessages() {
    setServerMessage(null);
    setErrors({});
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const problemStatement = String(formData.get("problemStatement") ?? "").trim();

    const nextErrors: FormErrors = {};
    let hasError = false;

    if (!name) {
      nextErrors.name = "Project name is required.";
      hasError = true;
    }
    if (!problemStatement) {
      nextErrors.problemStatement = "Problem statement is required.";
      hasError = true;
    }

    if (hasError) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await createProject(formData);
      if (result.success) {
        router.push("/projects");
      } else {
        setServerMessage({
          type: "error",
          text: result.message ?? "Failed to create project.",
        });
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
          href="/dashboard"
          className="font-serif text-xl font-bold tracking-tight text-stride-dark"
        >
          STRIDE
        </Link>
        <Link
          href="/projects"
          className="text-sm font-medium text-stride-sage hover:text-stride-olive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 rounded-full px-3 py-1"
        >
          Back to Projects
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-stride-dark">
              Create a Project
            </h1>
            <p className="mt-2 text-stride-dark/70 text-sm">
              Describe the problem you want to solve.
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
                Project name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="off"
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
              <label htmlFor="domain" className="block text-sm font-medium text-stride-dark">
                Domain
              </label>
              <input
                id="domain"
                name="domain"
                type="text"
                autoComplete="off"
                value="Engineering & Software Innovation"
                readOnly
                className="w-full rounded-lg border px-4 py-2.5 text-sm text-stride-dark/60 transition-colors focus-visible:outline-none focus-visible:ring-stride-olive"
              />
              <p className="text-xs text-stride-sage/80">
                MVP domain: Engineering & Software Innovation.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="problemStatement" className="block text-sm font-medium text-stride-dark">
                Problem statement
              </label>
              <textarea
                id="problemStatement"
                name="problemStatement"
                rows={5}
                autoComplete="off"
                required
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                  errors.problemStatement ? "border-stride-dark/50" : "border-stride-stone"
                }`}
                aria-invalid={errors.problemStatement ? "true" : "false"}
                aria-describedby={errors.problemStatement ? "problem-error" : undefined}
              />
              {errors.problemStatement && (
                <p id="problem-error" className="text-sm text-stride-dark/60">
                  {errors.problemStatement}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="learningObjective" className="block text-sm font-medium text-stride-dark">
                Learning objective (optional)
              </label>
              <textarea
                id="learningObjective"
                name="learningObjective"
                rows={3}
                autoComplete="off"
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm py-3.5 transition-colors hover:bg-stride-dark disabled:bg-stride-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              {loading ? "Creating project..." : "Create project"}
            </button>
          </form>

          <p className="text-center text-sm text-stride-dark/60">
            Your project will be linked to your account and appear in My Projects.
          </p>
        </div>
      </main>
    </div>
  );
}

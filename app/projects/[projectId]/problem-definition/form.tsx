"use client";

import { useState, useEffect } from "react";
import { saveProblemDefinition } from "@/app/projects/actions";

interface ProblemDefinitionFormProps {
  projectId: string;
  initialRefinedProblemStatement: string | null;
  initialTargetUsers: string | null;
  initialProblemEvidence: string | null;
}

export default function ProblemDefinitionForm({
  projectId,
  initialRefinedProblemStatement,
  initialTargetUsers,
  initialProblemEvidence,
}: ProblemDefinitionFormProps) {
  const [refinedProblemStatement, setRefinedProblemStatement] = useState<string>(initialRefinedProblemStatement ?? "");
  const [targetUsers, setTargetUsers] = useState<string>(initialTargetUsers ?? "");
  const [problemEvidence, setProblemEvidence] = useState<string>(initialProblemEvidence ?? "");
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  function clearMessages() {
    setServerMessage(null);
  }

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const refinedText = refinedProblemStatement.trim();
    if (!refinedText) {
      setServerMessage({
        type: "error",
        text: "Refined problem statement is required.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await saveProblemDefinition(projectId, refinedText, targetUsers, problemEvidence);
      if (result.success) {
        setServerMessage({
          type: "success",
          text: "Problem definition saved successfully.",
        });
        setHasUnsavedChanges(false);
      } else {
        setServerMessage({
          type: "error",
          text: result.message ?? "Failed to save problem definition.",
        });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while saving.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4" noValidate>
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
        <label htmlFor="refinedProblemStatement" className="block text-sm font-medium text-stride-dark">
          Refined Problem Statement
        </label>
        <textarea
          id="refinedProblemStatement"
          name="refinedProblemStatement"
          rows={6}
          className="w-full rounded-lg border border-stride-stone px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors"
          placeholder="Refine and restate the core problem you are solving..."
          value={refinedProblemStatement}
          onChange={(event) => {
            setRefinedProblemStatement(event.target.value);
            setHasUnsavedChanges(true);
          }}
        />
        <p className="text-xs text-stride-sage/80">
          Clearly articulate the core problem you are solving.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="targetUsers" className="block text-sm font-medium text-stride-dark">
          Target Users
        </label>
        <textarea
          id="targetUsers"
          name="targetUsers"
          rows={4}
          className="w-full rounded-lg border border-stride-stone px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors"
          placeholder="Who experiences this problem? Describe their characteristics, context, and constraints..."
          value={targetUsers}
          onChange={(event) => {
            setTargetUsers(event.target.value);
            setHasUnsavedChanges(true);
          }}
        />
        <p className="text-xs text-stride-sage/80">
          Be specific about who is affected and why they matter.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="problemEvidence" className="block text-sm font-medium text-stride-dark">
          Evidence Supporting the Problem
        </label>
        <textarea
          id="problemEvidence"
          name="problemEvidence"
          rows={6}
          className="w-full rounded-lg border border-stride-stone px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors"
          placeholder="What evidence confirms this problem is real and worth solving? Cite observations, interviews, data, or research..."
          value={problemEvidence}
          onChange={(event) => {
            setProblemEvidence(event.target.value);
            setHasUnsavedChanges(true);
          }}
        />
        <p className="text-xs text-stride-sage/80">
          Ground your problem definition in evidence, not assumptions.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm py-3.5 transition-colors hover:bg-stride-dark disabled:bg-stride-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
      >
        {loading ? "Saving..." : "Save Problem Definition"}
      </button>

      {hasUnsavedChanges && (
        <p className="text-xs text-stride-dark/50 mt-2">
          Unsaved changes
        </p>
      )}
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import { saveResearchNotes } from "@/app/projects/actions";

interface ResearchFormProps {
  projectId: string;
  initialNotes: string | null;
}

export default function ResearchForm({
  projectId,
  initialNotes,
}: ResearchFormProps) {
  const [notes, setNotes] = useState<string>(initialNotes ?? "");
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

    const notesText = notes.trim();
    if (!notesText) {
      setServerMessage({
        type: "error",
        text: "Research notes cannot be empty.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await saveResearchNotes(projectId, notesText);
      if (result.success) {
        setServerMessage({
          type: "success",
          text: "Research notes saved successfully.",
        });
        setHasUnsavedChanges(false);
      } else {
        setServerMessage({
          type: "error",
          text: result.message ?? "Failed to save research notes.",
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

      <label htmlFor="researchNotes" className="block text-sm font-medium text-stride-dark">
        Research Notes & Findings
      </label>
      <textarea
        id="researchNotes"
        name="researchNotes"
        rows={14}
        className="w-full rounded-lg border border-stride-stone px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors"
        placeholder="Document your research findings, sources, observations, and next steps here..."
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setHasUnsavedChanges(true);
        }}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-stride-olive text-stride-olive-contrast font-medium text-sm py-3.5 transition-colors hover:bg-stride-dark disabled:bg-stride-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
      >
        {loading ? "Saving..." : "Save Research Notes"}
      </button>

      {hasUnsavedChanges && (
        <p className="text-xs text-stride-dark/50 mt-2">
          Unsaved changes
        </p>
      )}
    </form>
  );
}

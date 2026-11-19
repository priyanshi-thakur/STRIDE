"use client";

import { useState } from "react";
import {
  createIdea,
  deleteIdea,
  getIdeas,
  selectPreferredIdea,
  updateIdea,
  type IdeationIdea,
} from "@/app/projects/actions";

interface IdeationFormProps {
  projectId: string;
  initialIdeas: IdeationIdea[];
}

export default function IdeationForm({
  projectId,
  initialIdeas,
}: IdeationFormProps) {
  const [ideas, setIdeas] = useState<IdeationIdea[]>(initialIdeas);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExpectedBenefit, setFormExpectedBenefit] = useState("");
  const [formFeasibility, setFormFeasibility] = useState("");
  const [formPotentialLimitations, setFormPotentialLimitations] = useState("");

  const [selectionRationale, setSelectionRationale] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpectedBenefit, setEditExpectedBenefit] = useState("");
  const [editFeasibility, setEditFeasibility] = useState("");
  const [editPotentialLimitations, setEditPotentialLimitations] = useState("");

  function clearMessages() {
    setServerMessage(null);
  }

  function resetCreateForm() {
    setFormTitle("");
    setFormDescription("");
    setFormExpectedBenefit("");
    setFormFeasibility("");
    setFormPotentialLimitations("");
  }

  function resetEditForm() {
    setEditTitle("");
    setEditDescription("");
    setEditExpectedBenefit("");
    setEditFeasibility("");
    setEditPotentialLimitations("");
  }

  function findIdea(id: string) {
    return ideas.find((idea) => idea.id === id);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const title = formTitle.trim();
    const description = formDescription.trim();
    const expectedBenefit = formExpectedBenefit.trim();
    const feasibility = formFeasibility.trim();
    const potentialLimitations = formPotentialLimitations.trim();

    if (!title) {
      setServerMessage({ type: "error", text: "Idea title is required." });
      return;
    }
    if (!description) {
      setServerMessage({ type: "error", text: "Idea description is required." });
      return;
    }
    if (!expectedBenefit) {
      setServerMessage({ type: "error", text: "Expected benefit is required." });
      return;
    }
    if (!feasibility) {
      setServerMessage({ type: "error", text: "Feasibility is required." });
      return;
    }
    if (!potentialLimitations) {
      setServerMessage({ type: "error", text: "Potential limitations is required." });
      return;
    }

    setLoading(true);
    try {
      const result = await createIdea(
        projectId,
        title,
        description,
        expectedBenefit,
        feasibility,
        potentialLimitations,
      );

      if (result.success) {
        const fetched = await getIdeas(projectId);
        if (fetched.success) {
          setIdeas(fetched.ideas);
        }
        setCreating(false);
        resetCreateForm();
        setServerMessage({ type: "success", text: "Idea created successfully." });
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Failed to create idea." });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while creating the idea.",
      });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(idea: IdeationIdea) {
    clearMessages();
    setEditTitle(idea.title);
    setEditDescription(idea.description);
    setEditExpectedBenefit(idea.expected_benefit);
    setEditFeasibility(idea.feasibility);
    setEditPotentialLimitations(idea.potential_limitations);
    setEditingId(idea.id);
  }

  function cancelEdit() {
    setEditingId(null);
    resetEditForm();
    clearMessages();
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const id = editingId;
    if (!id) return;

    const title = editTitle.trim();
    const description = editDescription.trim();
    const expectedBenefit = editExpectedBenefit.trim();
    const feasibility = editFeasibility.trim();
    const potentialLimitations = editPotentialLimitations.trim();

    if (!title) {
      setServerMessage({ type: "error", text: "Idea title is required." });
      return;
    }
    if (!description) {
      setServerMessage({ type: "error", text: "Idea description is required." });
      return;
    }
    if (!expectedBenefit) {
      setServerMessage({ type: "error", text: "Expected benefit is required." });
      return;
    }
    if (!feasibility) {
      setServerMessage({ type: "error", text: "Feasibility is required." });
      return;
    }
    if (!potentialLimitations) {
      setServerMessage({ type: "error", text: "Potential limitations is required." });
      return;
    }

    setLoading(true);
    try {
      const result = await updateIdea(
        id,
        title,
        description,
        expectedBenefit,
        feasibility,
        potentialLimitations,
      );

      if (result.success) {
        setIdeas((current) =>
          current.map((idea) =>
            idea.id === id
              ? {
                  ...idea,
                  title,
                  description,
                  expected_benefit: expectedBenefit,
                  feasibility,
                  potential_limitations: potentialLimitations,
                  updated_at: new Date().toISOString(),
                }
              : idea,
          ),
        );
        setEditingId(null);
        resetEditForm();
        setServerMessage({ type: "success", text: "Idea updated successfully." });
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Failed to update idea." });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while updating the idea.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const id = deletingId;
    if (!id) return;

    setLoading(true);
    try {
      const result = await deleteIdea(id);

      if (result.success) {
        setIdeas((current) => current.filter((idea) => idea.id !== id));
        setDeletingId(null);
        setServerMessage({ type: "success", text: "Idea deleted successfully." });
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Failed to delete idea." });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while deleting the idea.",
      });
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(id: string) {
    clearMessages();
    setDeletingId(id);
  }

  function cancelDelete() {
    setDeletingId(null);
    clearMessages();
  }

  function startSelect(id: string) {
    clearMessages();
    setSelectingId(id);
    setSelectionRationale(findIdea(id)?.preferred_rationale ?? "");
  }

  function cancelSelect() {
    setSelectingId(null);
    setSelectionRationale("");
    clearMessages();
  }

  async function handleSelectPreferred() {
    const id = selectingId;
    if (!id) return;

    const rationale = selectionRationale.trim();
    if (!rationale) {
      setServerMessage({ type: "error", text: "A selection rationale is required." });
      return;
    }

    setLoading(true);
    try {
      const result = await selectPreferredIdea(projectId, id, rationale);

      if (result.success) {
        const fetched = await getIdeas(projectId);
        if (fetched.success) {
          setIdeas(fetched.ideas);
        }
        setSelectingId(null);
        setSelectionRationale("");
        setServerMessage({
          type: "success",
          text: "Preferred idea selected. Ideation stage marked complete.",
        });
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Failed to select preferred idea." });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while selecting the preferred idea.",
      });
    } finally {
      setLoading(false);
    }
  }

  const hasIdeas = ideas.length > 0;

  return (
    <div className="space-y-6">
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

      {!creating ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            clearMessages();
            setCreating(true);
          }}
          className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
            loading
              ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
              : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
          }`}
        >
          {loading ? "Creating..." : "+ Add Idea"}
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            clearMessages();
            setCreating(false);
          }}
          className="inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 bg-stride-stone/20 text-stride-dark"
        >
          Cancel
        </button>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark">
            Add a New Idea
          </h3>
          <div className="space-y-2">
            <label htmlFor="ideaTitle" className="block text-sm font-medium text-stride-dark">
              Idea Title
            </label>
            <input
              id="ideaTitle"
              name="ideaTitle"
              type="text"
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              placeholder="Give your idea a short, clear title"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ideaDescription" className="block text-sm font-medium text-stride-dark">
              Description
            </label>
            <textarea
              id="ideaDescription"
              name="ideaDescription"
              rows={5}
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              placeholder="What is the idea? Describe the solution concept."
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ideaExpectedBenefit" className="block text-sm font-medium text-stride-dark">
              Expected Benefit
            </label>
            <textarea
              id="ideaExpectedBenefit"
              name="ideaExpectedBenefit"
              rows={4}
              value={formExpectedBenefit}
              onChange={(event) => setFormExpectedBenefit(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              placeholder="What value would this idea deliver if implemented?"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ideaFeasibility" className="block text-sm font-medium text-stride-dark">
              Feasibility
            </label>
            <textarea
              id="ideaFeasibility"
              name="ideaFeasibility"
              rows={4}
              value={formFeasibility}
              onChange={(event) => setFormFeasibility(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              placeholder="How feasible is this idea? Consider time, skills, and resources."
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ideaPotentialLimitations" className="block text-sm font-medium text-stride-dark">
              Potential Limitations
            </label>
            <textarea
              id="ideaPotentialLimitations"
              name="ideaPotentialLimitations"
              rows={4}
              value={formPotentialLimitations}
              onChange={(event) => setFormPotentialLimitations(event.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              placeholder="What are the drawbacks, risks, or constraints of this idea?"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                loading
                  ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                  : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
              }`}
            >
              {loading ? "Creating..." : "Save Idea"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setCreating(false);
                resetCreateForm();
                clearMessages();
              }}
              className="rounded-full px-6 py-3 font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 bg-stride-stone/20 text-stride-dark"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!hasIdeas && !creating && (
        <div className="rounded-xl border border-stride-stone bg-white p-12 shadow-sm text-center">
          <h3 className="font-serif text-xl font-bold tracking-tight text-stride-dark mb-3">
            No ideas yet
          </h3>
          <p className="text-stride-dark/70 text-sm mb-6">
            Start by adding your first idea. You can create multiple ideas,
            compare them, and select one as your preferred approach.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              clearMessages();
              setCreating(true);
            }}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
              loading
                ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
            }`}
          >
            {loading ? "Creating..." : "+ Add Your First Idea"}
          </button>
        </div>
      )}

      {editingId && (
        <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark">
            Edit Idea
          </h3>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`edit-title-${editingId}`} className="block text-sm font-medium text-stride-dark">
                Title
              </label>
              <input
                id={`edit-title-${editingId}`}
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`edit-description-${editingId}`} className="block text-sm font-medium text-stride-dark">
                Description
              </label>
              <textarea
                id={`edit-description-${editingId}`}
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={5}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`edit-benefit-${editingId}`} className="block text-sm font-medium text-stride-dark">
                Expected Benefit
              </label>
              <textarea
                id={`edit-benefit-${editingId}`}
                value={editExpectedBenefit}
                onChange={(event) => setEditExpectedBenefit(event.target.value)}
                rows={4}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`edit-feasibility-${editingId}`} className="block text-sm font-medium text-stride-dark">
                Feasibility
              </label>
              <textarea
                id={`edit-feasibility-${editingId}`}
                value={editFeasibility}
                onChange={(event) => setEditFeasibility(event.target.value)}
                rows={4}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`edit-limitations-${editingId}`} className="block text-sm font-medium text-stride-dark">
                Potential Limitations
              </label>
              <textarea
                id={`edit-limitations-${editingId}`}
                value={editPotentialLimitations}
                onChange={(event) => setEditPotentialLimitations(event.target.value)}
                rows={4}
                className="w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className={`rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                  loading
                    ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                    : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                }`}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={cancelEdit}
                className="rounded-full px-6 py-3 font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 bg-stride-stone/20 text-stride-dark"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!editingId && hasIdeas && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
          style={{ minWidth: 0 }}
        >
          {ideas.map((idea) => {
            const isSelecting = selectingId === idea.id;
            const isDeleting = deletingId === idea.id;

            return (
              <div
                key={idea.id}
                className={`rounded-xl border p-5 shadow-sm transition-colors min-w-0 ${
                  idea.is_preferred
                    ? "border-stride-olive bg-stride-mint/30"
                    : "border-stride-stone bg-white hover:border-stride-olive"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-serif text-lg font-bold tracking-tight text-stride-dark">
                    {idea.title}
                  </h4>
                  {idea.is_preferred && (
                    <span className="inline-flex items-center rounded-full bg-stride-olive px-2.5 py-0.5 text-xs font-medium text-stride-olive-contrast">
                      Preferred
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-sm text-stride-dark/80">
                  <p className="leading-relaxed">{idea.description}</p>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-stride-dark/50 mb-1">
                      Expected Benefit
                    </p>
                    <p className="text-stride-dark/70 leading-relaxed">
                      {idea.expected_benefit}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-stride-dark/50 mb-1">
                      Feasibility
                    </p>
                    <p className="text-stride-dark/70 leading-relaxed">
                      {idea.feasibility}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-stride-dark/50 mb-1">
                      Potential Limitations
                    </p>
                    <p className="text-stride-dark/70 leading-relaxed">
                      {idea.potential_limitations}
                    </p>
                  </div>
                </div>

                {idea.is_preferred && (
                  <div className="mt-3 pt-3 border-t border-stride-stone/30">
                    <p className="text-xs font-medium text-stride-dark/50 mb-1">
                      Selection Rationale
                    </p>
                    <p className="text-stride-dark/70 text-sm leading-relaxed">
                      {idea.preferred_rationale || "No rationale recorded."}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {!idea.is_preferred && (
                    <button
                      type="button"
                      disabled={loading || isSelecting}
                      onClick={() => startSelect(idea.id)}
                      className={`text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 ${
                        loading || isSelecting
                          ? "text-stride-sage/40 cursor-not-allowed"
                          : "text-stride-olive hover:text-stride-dark"
                      }`}
                    >
                      Select as Preferred
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => startEdit(idea)}
                    className={`text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 ${
                      loading
                        ? "text-stride-sage/40 cursor-not-allowed"
                        : "text-stride-sage hover:text-stride-dark"
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={loading || isDeleting}
                    onClick={() => confirmDelete(idea.id)}
                    className={`text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 ${
                      loading || isDeleting
                        ? "text-stride-sage/40 cursor-not-allowed"
                        : "text-stride-dark/60 hover:text-stride-dark"
                    }`}
                  >
                    Delete
                  </button>
                </div>

                {isSelecting && (
                  <div className="mt-3 rounded-lg border border-stride-stone bg-white p-4 space-y-3">
                    <label className="block text-xs font-medium text-stride-dark">
                      Why is this your preferred idea?
                    </label>
                    <textarea
                      value={selectionRationale}
                      onChange={(event) => setSelectionRationale(event.target.value)}
                      rows={3}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors border-stride-stone"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleSelectPreferred}
                        className={`rounded-full px-4 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                          loading
                            ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                            : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                        }`}
                      >
                        {loading ? "Selecting..." : "Confirm Selection"}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={cancelSelect}
                        className="rounded-full px-4 py-2 font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 bg-stride-stone/20 text-stride-dark"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {isDeleting && (
                  <div className="mt-3 rounded-lg border border-stride-stone bg-white p-4 space-y-3">
                    <p className="text-sm text-stride-dark">
                      Are you sure you want to delete this idea? This cannot be
                      undone.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleDelete}
                        className={`rounded-full px-4 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                          loading
                            ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                            : "bg-stride-dark text-white hover:bg-stride-olive"
                        }`}
                      >
                        {loading ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={cancelDelete}
                        className="rounded-full px-4 py-2 font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 bg-stride-stone/20 text-stride-dark"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!editingId && hasIdeas && (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            clearMessages();
            setCreating(true);
          }}
          className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
            loading
              ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
              : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
          }`}
        >
          {loading ? "Creating..." : "+ Add Another Idea"}
        </button>
      )}
    </div>
  );
}

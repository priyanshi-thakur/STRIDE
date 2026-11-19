"use client";

import { useState, useCallback, useEffect } from "react";
import {
  deletePrototypeEvidence,
  generateProjectEvaluation,
  getProjectEvaluationReports,
  getPrototypeEvidence,
  saveProjectGitHubUrl,
  saveProjectWebsiteUrl,
  uploadPrototypeEvidence,
  type PrototypeEvidence,
  type ProjectEvaluationReport,
} from "@/app/projects/actions";
import type { EvaluationReport } from "@/app/lib/ai/evaluation-service";

interface PrototypeEvidenceFormProps {
  projectId: string;
  initialEvidence: PrototypeEvidence[];
  initialGitHubUrl: string | null;
  initialWebsiteUrl: string | null;
}

const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

interface SelectedFile {
  file: File;
  description: string;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export default function PrototypeEvidenceForm({
  projectId,
  initialEvidence,
  initialGitHubUrl,
  initialWebsiteUrl,
}: PrototypeEvidenceFormProps) {
  const [evidence, setEvidence] = useState<PrototypeEvidence[]>(initialEvidence);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const [evaluations, setEvaluations] = useState<ProjectEvaluationReport[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProjectEvaluationReport | null>(null);

  const [githubUrl, setGithubUrl] = useState<string | null>(initialGitHubUrl ?? null);
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(initialWebsiteUrl ?? null);
  const [githubInput, setGithubInput] = useState(initialGitHubUrl ?? "");
  const [websiteInput, setWebsiteInput] = useState(initialWebsiteUrl ?? "");
  const [githubEditing, setGithubEditing] = useState(false);
  const [websiteEditing, setWebsiteEditing] = useState(false);
  const [githubSaving, setGithubSaving] = useState(false);
  const [websiteSaving, setWebsiteSaving] = useState(false);
  const [githubMessage, setGithubMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [websiteMessage, setWebsiteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [previewItem, setPreviewItem] = useState<PrototypeEvidence | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function clearMessages() {
    setServerMessage(null);
  }

  const loadEvidence = useCallback(async () => {
    const result = await getPrototypeEvidence(projectId);
    if (result.success) {
      setEvidence(result.evidence);
    }
  }, [projectId]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length < 1) return;

    const newSelected: SelectedFile[] = files.map((file) => ({
      file,
      description: "",
      status: "idle",
    }));

    setSelectedFiles((prev) => [...prev, ...newSelected]);
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFileDescription(index: number, value: string) {
    setSelectedFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], description: value };
      return next;
    });
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const filesToUpload = selectedFiles.filter((f) => f.status !== "success");
    if (filesToUpload.length < 1) {
      setServerMessage({ type: "error", text: "Please select files to upload." });
      return;
    }

    setUploading(true);

    // Mark all as uploading
    setSelectedFiles((prev) =>
      prev.map((f) => (f.status !== "success" ? { ...f, status: "uploading" } : f)),
    );

    const files = filesToUpload.map((f) => f.file);
    const descriptions = filesToUpload.map((f) => f.description);

    try {
      const result = await uploadPrototypeEvidence(projectId, files, descriptions);

      if (result.success) {
        // Update statuses based on results - match by index, not filename,
        // so duplicate filenames are handled correctly
        const failedIndices = new Set(result.failedFiles.map((f) => f.index));

        setSelectedFiles((prev) =>
          prev.map((f) => {
            // Find this selected file's position within filesToUpload
            const uploadIdx = filesToUpload.findIndex((ftu) => ftu.file === f.file);
            if (uploadIdx !== -1 && failedIndices.has(uploadIdx)) {
              const failure = result.failedFiles.find((fl) => fl.index === uploadIdx);
              return { ...f, status: "error", errorMessage: failure?.message };
            }
            return { ...f, status: "success" };
          }),
        );

        await loadEvidence();

        if (result.uploadedCount > 0) {
          setServerMessage({
            type: "success",
            text: `Uploaded ${result.uploadedCount} of ${result.totalCount} file(s) successfully.`,
          });
        }
        if (result.failedFiles.length > 0) {
          setServerMessage({
            type: "error",
            text: `${result.failedFiles.length} file(s) failed to upload.`,
          });
        }

        // Clear successfully uploaded files from selection
        setSelectedFiles((prev) =>
          prev.filter((f) => f.status !== "success"),
        );
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Failed to upload evidence." });
        setSelectedFiles((prev) =>
          prev.map((f) => (f.status === "uploading" ? { ...f, status: "error" } : f)),
        );
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while uploading evidence.",
      });
      setSelectedFiles((prev) =>
        prev.map((f) => (f.status === "uploading" ? { ...f, status: "error" } : f)),
      );
    } finally {
      setUploading(false);
    }
  }

  const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/;

  function validateGitHubUrl(url: string): string | null {
    if (!url || url.trim().length < 1) return null;
    if (!GITHUB_URL_REGEX.test(url.trim())) {
      return "Please enter a valid public GitHub repository URL (e.g., https://github.com/owner/repo).";
    }
    return null;
  }

  function validateWebsiteUrl(url: string): string | null {
    if (!url || url.trim().length < 1) return null;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "Website URL must use http or https protocol.";
      }
    } catch {
      return "Please enter a valid website URL.";
    }
    return null;
  }

  function startEditGitHub() {
    setGithubMessage(null);
    setGithubInput(githubUrl ?? "");
    setGithubEditing(true);
  }

  function cancelEditGitHub() {
    setGithubInput(githubUrl ?? "");
    setGithubEditing(false);
    setGithubMessage(null);
  }

  async function saveGitHubUrl() {
    const trimmed = githubInput.trim();
    const validationError = validateGitHubUrl(trimmed);
    if (validationError) {
      setGithubMessage({ type: "error", text: validationError });
      return;
    }

    setGithubSaving(true);
    setGithubMessage(null);
    try {
      const result = await saveProjectGitHubUrl(projectId, trimmed || null);
      if (result.success) {
        setGithubUrl(trimmed || null);
        setGithubEditing(false);
        setGithubMessage({ type: "success", text: "GitHub repository URL saved." });
      } else {
        setGithubMessage({ type: "error", text: result.message ?? "Failed to save GitHub URL." });
      }
    } catch {
      setGithubMessage({ type: "error", text: "An unexpected error occurred while saving the GitHub URL." });
    } finally {
      setGithubSaving(false);
    }
  }

  function startEditWebsite() {
    setWebsiteMessage(null);
    setWebsiteInput(websiteUrl ?? "");
    setWebsiteEditing(true);
  }

  function cancelEditWebsite() {
    setWebsiteInput(websiteUrl ?? "");
    setWebsiteEditing(false);
    setWebsiteMessage(null);
  }

  async function saveWebsiteUrl() {
    const trimmed = websiteInput.trim();
    const validationError = validateWebsiteUrl(trimmed);
    if (validationError) {
      setWebsiteMessage({ type: "error", text: validationError });
      return;
    }

    setWebsiteSaving(true);
    setWebsiteMessage(null);
    try {
      const result = await saveProjectWebsiteUrl(projectId, trimmed || null);
      if (result.success) {
        setWebsiteUrl(trimmed || null);
        setWebsiteEditing(false);
        setWebsiteMessage({ type: "success", text: "Website URL saved." });
      } else {
        setWebsiteMessage({ type: "error", text: result.message ?? "Failed to save website URL." });
      }
    } catch {
      setWebsiteMessage({ type: "error", text: "An unexpected error occurred while saving the website URL." });
    } finally {
      setWebsiteSaving(false);
    }
  }

  const loadEvaluationReports = useCallback(async () => {
    const result = await getProjectEvaluationReports(projectId);
    if (result.success) {
      setEvaluations(result.reports);
    }
  }, [projectId]);

  useEffect(() => {
    async function load() {
      await loadEvaluationReports();
    }
    load();
  }, [loadEvaluationReports]);

  async function handleAnalyseProject() {
    setAnalysing(true);
    setServerMessage(null);
    try {
      const result = await generateProjectEvaluation(projectId);
      if (result.success) {
        setEvaluations((prev) => [result.report, ...prev]);
        setSelectedReport(result.report);
        setServerMessage({
          type: "success",
          text: "Evaluation report generated successfully.",
        });
      } else {
        setServerMessage({
          type: "error",
          text: result.message ?? "Failed to generate evaluation.",
        });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while generating the evaluation.",
      });
    } finally {
      setAnalysing(false);
    }
  }

  function selectReport(report: ProjectEvaluationReport) {
    setSelectedReport(report);
  }

  function closeReport() {
    setSelectedReport(null);
  }

  async function handleDelete(evidenceId: string) {
    setDeletingId(evidenceId);
    setLoading(true);
    try {
      const result = await deletePrototypeEvidence(evidenceId);
      if (result.success) {
        setEvidence((current) => current.filter((item) => item.id !== evidenceId));
        setServerMessage({ type: "success", text: "Evidence deleted successfully." });
      } else {
        setServerMessage({ type: "error", text: result.message ?? "Failed to delete evidence." });
      }
    } catch {
      setServerMessage({
        type: "error",
        text: "An unexpected error occurred while deleting evidence.",
      });
    } finally {
      setDeletingId(null);
      setLoading(false);
    }
  }

  function confirmDelete(evidenceId: string) {
    clearMessages();
    setDeletingId(evidenceId);
  }

  function cancelDelete() {
    setDeletingId(null);
    clearMessages();
  }

  function openPreview(item: PrototypeEvidence) {
    setPreviewItem(item);
    setPreviewOpen(true);
  }

  function closePreview() {
    setPreviewItem(null);
    setPreviewOpen(false);
  }

  const isImage = (fileType: string) => fileType.startsWith("image/");
  const isVideo = (fileType: string) => fileType.startsWith("video/");

  const formattedSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-GB", { timeZone: "UTC" });
  };

  const pendingCount = selectedFiles.filter(
    (f) => f.status === "idle" || f.status === "uploading" || f.status === "error",
  ).length;
  const hasPending = pendingCount > 0;

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

      {/* Upload form */}
      <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark">
          Submit Prototype Evidence
        </h3>
        <p className="text-stride-dark/70 text-sm mb-4">
          Upload screenshots or screen recordings from your locally running
          prototype. Deployment is not required. You can select multiple files at once.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="evidenceFiles" className="block text-sm font-medium text-stride-dark">
              Select Files
            </label>
            <input
              id="evidenceFiles"
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(",")}
              multiple
              onChange={handleFileChange}
              disabled={uploading}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                uploading ? "border-stride-sage/40" : "border-stride-stone"
              }`}
            />
            <p className="text-xs text-stride-sage/80">
              Multiple files allowed. Max 50 MB per file. Supported: images
              (PNG, JPEG, WebP, GIF), videos (MP4, WebM, OGG, MOV).
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium text-stride-dark/70 mb-2">
                Selected files ({selectedFiles.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((sf, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg border bg-stride-ivory/30"
                  >
                    <span className="text-xs text-stride-sage/80 shrink-0">
                      {sf.file.name}
                    </span>
                    <span className="text-xs text-stride-sage/80 shrink-0">
                      · {formattedSize(sf.file.size)}
                    </span>
                    {sf.status === "error" && (
                      <span className="text-xs text-stride-dark/60 flex-shrink-0">
                        ⚠ {sf.errorMessage}
                      </span>
                    )}
                    <div className="flex-1">
                      <textarea
                        value={sf.description}
                        onChange={(e) => updateFileDescription(index, e.target.value)}
                        rows={1}
                        className="w-full text-xs border-none bg-transparent focus:ring-0 p-0 text-stride-dark resize-none"
                        placeholder="Description (optional)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      className="text-xs text-stride-dark/60 hover:text-stride-olive underline underline-offset-4"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={uploading || !hasPending}
              className={`rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                uploading || !hasPending
                  ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                  : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
              }`}
            >
              {uploading ? "Uploading..." : "Upload Selected Files"}
            </button>
          </div>
        </form>
      </div>

      {/* Evidence list / gallery */}
      <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm">
        <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark mb-4">
          Submitted Evidence
        </h3>

        {evidence.length === 0 && (
          <div className="rounded-lg border border-stride-stone bg-stride-ivory/50 p-12 text-center">
            <p className="text-stride-dark/70 text-sm">
              No evidence submitted yet. Upload your first screenshot or screen
              recording to get started.
            </p>
          </div>
        )}

        {evidence.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {evidence.map((item) => {
              const isDeleting = deletingId === item.id;
              const isImg = isImage(item.file_type);
              const isVid = isVideo(item.file_type);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-stride-stone bg-white p-4 shadow-sm transition-colors hover:border-stride-olive group cursor-pointer"
                  onClick={() => openPreview(item)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-serif text-sm font-bold tracking-tight text-stride-dark truncate">
                      {item.file_name}
                    </h4>
                    {isImg && (
                      <span className="inline-flex items-center rounded-full bg-stride-mint px-2 py-0.5 text-xs font-medium text-stride-dark">
                        Screenshot
                      </span>
                    )}
                    {isVid && (
                      <span className="inline-flex items-center rounded-full bg-stride-blush/50 px-2 py-0.5 text-xs font-medium text-stride-dark">
                        Recording
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stride-dark/50 mb-3">
                    <span>{formattedSize(item.file_size)}</span>
                    <span>{item.file_type}</span>
                    <span>{formatDate(item.uploaded_at)}</span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-stride-dark/70 leading-relaxed mb-3">
                      {item.description}
                    </p>
                  )}

                  {/* Preview area - clickable thumbnail */}
                  <div className="aspect-video rounded-lg border border-stride-stone bg-stride-ivory/50 overflow-hidden relative">
                    {isImg && item.signed_url && (
                      <img
                        src={item.signed_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    )}
                    {isVid && item.signed_url && (
                      <video
                        src={item.signed_url}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                        muted
                        playsInline
                      />
                    )}
                    {!item.signed_url && (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-xs text-stride-dark/50">
                          Preview unavailable
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to view
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      disabled={loading || isDeleting}
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(item.id);
                      }}
                      className={`text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 ${
                        loading || isDeleting
                          ? "text-stride-sage/40 cursor-not-allowed"
                          : "text-stride-dark/60 hover:text-stride-dark"
                      }`}
                    >
                      Delete
                    </button>
                  </div>

                  {isDeleting && (
                    <div className="mt-3 rounded-lg border border-stride-stone bg-white p-3 space-y-3">
                      <p className="text-sm text-stride-dark">
                        Are you sure you want to delete this evidence? This cannot
                        be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleDelete(item.id)}
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
      </div>

      {/* GitHub Repository submission */}
      <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark">
            GitHub Repository
          </h3>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-stride-mint px-3 py-1 text-xs font-medium text-stride-dark hover:bg-stride-sage/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              <span className="text-stride-sage/80">Open repository</span>
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C-4.422 18.27-3.933 17.7-3.933 17.7c-1.032-.733.228-.717.228-.717 1.261.085 1.927 1.307 1.927 1.307 1.51 1.945 2.952 1.385 3.665 1.055.207-.834.79-1.402 1.438-1.727-3.594-.4-7.396-1.791-7.396-8.107 0-1.792.63-3.263 1.665-4.424-.177-.447-.74-2.24-.04-4.658 0 0 1.336-.427 4.364 1.626a12.86 12.86 0 0 1 3.676-.415c1.233 0 2.471.14 3.682.408 3.025-2.053 4.364-1.626 4.364-1.626.7 2.415.137 4.21-.04 4.658 1.035 1.161 1.665 2.632 1.665 4.424 0 2.869-4.306 7.706-8.12 8.143.66.542.837 1.432.837 2.34 0 1.678-.015 3.034-.015 3.452 0 .319.221.69.825.572C7.713 21.8 11.15 17.307 11.15 12.307c0-2.04-.82-3.894-2.104-5.245-.648-.355-1.397-.58-2.177-.25-.777.329-1.3 1.04-1.3 1.816 0 1.325.272 2.614.83 3.618.476.855 1.492 1.482 2.662 1.94.382.412.663.906.663 1.454 0 .464-.055 1.298-.03 2.037.024.179.427.395.825.575z" />
              </svg>
            </a>
          )}
        </div>

        {githubEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); saveGitHubUrl(); }} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="githubUrlInput" className="block text-sm font-medium text-stride-dark">
                Repository URL
              </label>
              <input
                id="githubUrlInput"
                type="text"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                disabled={githubSaving}
                placeholder="https://github.com/owner/repo"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                  githubSaving ? "border-stride-sage/40" : "border-stride-stone"
                }`}
              />
            </div>
            <p className="text-xs text-stride-sage/80">
              Public GitHub repository URL only (e.g., https://github.com/owner/repo).
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={githubSaving}
                className={`rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                  githubSaving
                    ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                    : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                }`}
              >
                {githubSaving ? "Saving..." : "Save URL"}
              </button>
              <button
                type="button"
                disabled={githubSaving}
                onClick={cancelEditGitHub}
                className="rounded-full px-6 py-3 font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 bg-stride-stone/20 text-stride-dark"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {githubMessage && (
              <div
                role="alert"
                className={`rounded-lg p-3 text-sm ${
                  githubMessage.type === "success"
                    ? "bg-stride-butter/50 border border-stride-butter text-stride-dark/80"
                    : "bg-stride-dark/5 border border-stride-dark/20 text-stride-dark"
                }`}
              >
                {githubMessage.text}
              </div>
            )}
            {githubUrl ? (
              <p className="text-sm text-stride-dark/70">
                Saved repository:{" "}
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stride-olive hover:text-stride-dark underline underline-offset-4"
                >
                  {githubUrl}
                </a>
              </p>
            ) : (
              <p className="text-sm text-stride-dark/70">
                No GitHub repository URL submitted yet.
              </p>
            )}
            <button
              type="button"
              onClick={startEditGitHub}
              disabled={githubSaving}
              className={`inline-flex items-center gap-1.5 rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                githubSaving
                  ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                  : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
              }`}
            >
              {githubUrl ? "Edit URL" : "Add Repository URL"}
            </button>
          </div>
        )}
      </div>

      {/* Live Website submission */}
      <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark">
            Live Website
          </h3>
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-stride-blush px-3 py-1 text-xs font-medium text-stride-dark hover:bg-stride-sage/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2"
            >
              <span className="text-stride-sage/80">Open website</span>
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C-4.422 18.27-3.933 17.7-3.933 17.7c-1.032-.733.228-.717.228-.717 1.261.085 1.927 1.307 1.927 1.307 1.51 1.945 2.952 1.385 3.665 1.055.207-.834.79-1.402 1.438-1.727-3.594-.4-7.396-1.791-7.396-8.107 0-1.792.63-3.263 1.665-4.424-.177-.447-.74-2.24-.04-4.658 0 0 1.336-.427 4.364 1.626a12.86 12.86 0 0 1 3.676-.415c1.233 0 2.471.14 3.682.408 3.025-2.053 4.364-1.626 4.364-1.626.7 2.415.137 4.21-.04 4.658 1.035 1.161 1.665 2.632 1.665 4.424 0 2.869-4.306 7.706-8.12 8.143.66.542.837 1.432.837 2.34 0 1.678-.015 3.034-.015 3.452 0 .319.221.69.825.572C7.713 21.8 11.15 17.307 11.15 12.307c0-2.04-.82-3.894-2.104-5.245-.648-.355-1.397-.58-2.177-.25-.777.329-1.3 1.04-1.3 1.816 0 1.325.272 2.614.83 3.618.476.855 1.492 1.482 2.662 1.94.382.412.663.906.663 1.454 0 .464-.055 1.298-.03 2.037.024.179.427.395.825.575z" />
              </svg>
            </a>
          )}
        </div>

        {websiteEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); saveWebsiteUrl(); }} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="websiteUrlInput" className="block text-sm font-medium text-stride-dark">
                Website URL
              </label>
              <input
                id="websiteUrlInput"
                type="text"
                value={websiteInput}
                onChange={(e) => setWebsiteInput(e.target.value)}
                disabled={websiteSaving}
                placeholder="https://your-deployed-site.com"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive transition-colors ${
                  websiteSaving ? "border-stride-sage/40" : "border-stride-stone"
                }`}
              />
            </div>
            <p className="text-xs text-stride-sage/80">
              Valid http or https URL (e.g., https://your-app.vercel.app).
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={websiteSaving}
                className={`rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                  websiteSaving
                    ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                    : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                }`}
              >
                {websiteSaving ? "Saving..." : "Save URL"}
              </button>
              <button
                type="button"
                disabled={websiteSaving}
                onClick={cancelEditWebsite}
                className="rounded-full px-6 py-3 font-medium text-sm transition-colors hover:bg-stride-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 bg-stride-stone/20 text-stride-dark"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {websiteMessage && (
              <div
                role="alert"
                className={`rounded-lg p-3 text-sm ${
                  websiteMessage.type === "success"
                    ? "bg-stride-butter/50 border border-stride-butter text-stride-dark/80"
                    : "bg-stride-dark/5 border border-stride-dark/20 text-stride-dark"
                }`}
              >
                {websiteMessage.text}
              </div>
            )}
            {websiteUrl ? (
              <p className="text-sm text-stride-dark/70">
                Saved website:{" "}
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stride-olive hover:text-stride-dark underline underline-offset-4"
                >
                  {websiteUrl}
                </a>
              </p>
            ) : (
              <p className="text-sm text-stride-dark/70">
                No website URL submitted yet.
              </p>
            )}
            <button
              type="button"
              onClick={startEditWebsite}
              disabled={websiteSaving}
              className={`inline-flex items-center gap-1.5 rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                websiteSaving
                  ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                  : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
              }`}
            >
              {websiteUrl ? "Edit URL" : "Add Website URL"}
            </button>
          </div>
        )}
      </div>

        {/* Analyse My Project */}
        <div className="rounded-xl border border-stride-stone bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="font-serif text-lg font-bold tracking-tight text-stride-dark">
              Analyse My Project
            </h3>
            {selectedReport && (
              <button
                type="button"
                onClick={closeReport}
                className="text-sm font-medium text-stride-sage hover:text-stride-olive underline underline-offset-4"
              >
                Close Report
              </button>
            )}
          </div>

          {selectedReport ? (
            <div className="space-y-4">
              {/* Cast report_content to typed EvaluationReport for property access */}
              {(() => {
                const report = selectedReport
                  .report_content as EvaluationReport;
                return (
                  <div className="rounded-lg border border-stride-stone bg-stride-mint/20 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-serif text-sm font-bold tracking-tight text-stride-dark">
                        Evaluation Report
                      </h4>
                      <button
                        type="button"
                        onClick={closeReport}
                        className="text-sm font-medium text-stride-sage hover:text-stride-olive underline underline-offset-4"
                      >
                        Close
                      </button>
                    </div>
                    <p className="text-xs text-stride-dark/50 mb-3">
                      Generated{" "}
                      <span className="font-medium">
                        {new Date(selectedReport.created_at).toLocaleDateString(
                          "en-GB",
                          { timeZone: "UTC" },
                        )}
                      </span>
                    </p>

                    {/* Project Overview */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Project Overview
                      </h5>
                      <p className="text-sm text-stride-dark/80">
                        <span className="font-medium">Name:</span>{" "}
                        {report.project_overview?.project_name ||
                          "Not specified"}
                      </p>
                      <p className="text-sm text-stride-dark/80">
                        <span className="font-medium">Context:</span>{" "}
                        {report.project_overview?.project_context ||
                          "Not specified"}
                      </p>
                    </div>

                    {/* Submitted Evidence */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Submitted Evidence
                      </h5>
                      <ul className="list-disc list-inside text-sm text-stride-dark/80 space-y-1">
                        {(report.project_overview?.submitted_evidence ??
                          []).map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Strengths */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Strengths
                      </h5>
                      {(report.strengths ?? []).length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-stride-dark/80 space-y-1">
                          {(report.strengths as Array<{ observation: string; evidence: string }>).map(
                            (s, idx) => (
                              <li key={idx} className="mb-1">
                                <span className="font-medium">{s.observation}</span>{" "}
                                <span className="text-stride-dark/60">({s.evidence})</span>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-stride-dark/60">None identified.</p>
                      )}
                    </div>

                    {/* Weaknesses */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Weaknesses
                      </h5>
                      {(report.weaknesses ?? []).length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-stride-dark/80 space-y-1">
                          {(report.weaknesses as Array<{ observation: string; why_it_matters: string }>).map(
                            (w, idx) => (
                              <li key={idx} className="mb-1">
                                <span className="font-medium">{w.observation}</span>{" "}
                                <span className="text-stride-dark/60">({w.why_it_matters})</span>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-stride-dark/60">None identified.</p>
                      )}
                    </div>

                    {/* Missing Features */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Missing Features
                      </h5>
                      {(report.missing_features ?? []).length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-stride-dark/80 space-y-1">
                          {(report.missing_features as string[]).map(
                            (f, idx) => (
                              <li key={idx}>{f}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-stride-dark/60">None identified.</p>
                      )}
                    </div>

                    {/* Technical Assessment */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Technical Assessment
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-stride-dark/80">
                        <p>
                          <span className="font-medium">Architecture:</span>{" "}
                          {report.technical_assessment?.architecture ||
                            "Not assessed"}
                        </p>
                        <p>
                          <span className="font-medium">Code Quality:</span>{" "}
                          {report.technical_assessment?.code_quality ||
                            "Not assessed"}
                        </p>
                        <p>
                          <span className="font-medium">Usability:</span>{" "}
                          {report.technical_assessment?.usability ||
                            "Not assessed"}
                        </p>
                        <p>
                          <span className="font-medium">Functionality:</span>{" "}
                          {report.technical_assessment?.functionality ||
                            "Not assessed"}
                        </p>
                        <p>
                          <span className="font-medium">Other:</span>{" "}
                          {report.technical_assessment?.other ||
                            "Not assessed"}
                        </p>
                      </div>
                    </div>

                    {/* Issues and Severity */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Issues and Severity
                      </h5>
                      {(report.issues_and_severity ?? []).length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-stride-dark/80 space-y-1">
                          {(report.issues_and_severity as Array<{ issue: string; severity: string }>).map(
                            (i, idx) => (
                              <li key={idx} className="mb-1">
                                <span className="font-medium">{i.issue}</span>{" "}
                                <span
                                  className={`text-xs font-medium ${
                                    i.severity === "critical"
                                      ? "text-stride-dark/80"
                                      : i.severity === "high"
                                      ? "text-stride-dark/70"
                                      : i.severity === "medium"
                                      ? "text-stride-dark/60"
                                      : "text-stride-dark/50"
                                }`}
                                >
                                  ({i.severity})
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-stride-dark/60">None identified.</p>
                      )}
                    </div>

                    {/* Completeness Assessment */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Completeness Assessment
                      </h5>
                      <p className="text-sm text-stride-dark/80">
                        {selectedReport.completeness_status}
                      </p>
                    </div>

                    {/* Recommended Improvements */}
                    <div className="mb-3">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Recommended Improvements
                      </h5>
                      {(report.recommended_improvements ?? []).length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-stride-dark/80 space-y-1">
                          {(report.recommended_improvements as string[]).map(
                            (r, idx) => (
                              <li key={idx}>{r}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-stride-dark/60">None identified.</p>
                      )}
                    </div>

                    {/* Overall Evaluation */}
                    <div className="mb-3 pt-2 border-t border-stride-stone/30">
                      <h5 className="font-serif text-sm font-bold text-stride-dark mb-1">
                        Overall Evaluation
                      </h5>
                      <p className="text-sm text-stride-dark/80 leading-relaxed">
                        {selectedReport.overall_assessment ||
                          "No overall evaluation available."}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stride-dark/70">
                Click &quot;Analyse My Project&quot; to generate a structured evaluation
                of your submitted evidence. The evaluation reviews your
                prototype evidence, GitHub repository, and live website (where
                available) and produces a detailed report with strengths,
                weaknesses, and recommended improvements.
              </p>
              <button
                type="button"
                disabled={analysing}
                onClick={handleAnalyseProject}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stride-olive focus-visible:ring-offset-2 ${
                  analysing
                    ? "bg-stride-sage text-stride-sage/60 cursor-not-allowed"
                    : "bg-stride-olive text-stride-olive-contrast hover:bg-stride-dark"
                }`}
              >
                {analysing ? "Analysing..." : "Analyse My Project"}
              </button>
            </div>
          )}

          {/* Evaluation History */}
          <div className="border-t pt-4">
            <h4 className="font-serif text-sm font-bold tracking-tight text-stride-dark mb-3">
              Evaluation History
            </h4>
            {evaluations.length === 0 ? (
              <p className="text-sm text-stride-dark/50 text-center py-4">
                No evaluation reports yet.
              </p>
            ) : (
              <div className="space-y-2">
                {evaluations.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-stride-stone bg-white p-3 hover:border-stride-olive transition-colors cursor-pointer"
                    onClick={() => selectReport(report)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-serif text-sm font-bold text-stride-dark">
                        Evaluation Report
                      </h5>
                      <span className="text-xs text-stride-dark/50">
                        {new Date(report.created_at).toLocaleDateString("en-GB", {
                          timeZone: "UTC",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-stride-dark/60 truncate">
                      {report.overall_assessment ||
                        "No assessment available."}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.completeness_status === "complete"
                          ? "bg-stride-mint/30 text-stride-dark border border-stride-mint/50"
                          : report.completeness_status === "pending"
                          ? "bg-stride-butter/30 text-stride-dark border border-stride-butter/50"
                          : "bg-stride-stone/30 text-stride-dark/60 border border-stride-stone/50"
                      }`}>
                        {report.completeness_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Preview modal */}
      {previewOpen && previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="relative z-60 max-w-4xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePreview}
              className="absolute top-0 right-0 text-white hover:text-stride-mint transition-colors"
            >
              ✕
            </button>
            <div className="flex flex-col items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-white truncate max-w-md">
                {previewItem.file_name}
              </h3>
              <p className="text-xs text-stride-sage/300">
                {formattedSize(previewItem.file_size)} · {previewItem.file_type}
              </p>
              {previewItem.description && (
                <p className="text-sm text-stride-sage/200 max-w-md">
                  {previewItem.description}
                </p>
              )}
              <div className="relative rounded-lg border border-white/30 bg-white/10 overflow-hidden max-w-full max-h-[70vh]">
                {isImage(previewItem.file_type) && previewItem.signed_url && (
                  <img
                    src={previewItem.signed_url}
                    alt={previewItem.file_name}
                    className="w-full h-auto object-contain"
                  />
                )}
                {isVideo(previewItem.file_type) && previewItem.signed_url && (
                  <video
                    src={previewItem.signed_url}
                    className="w-full h-auto object-contain"
                    controls
                    preload="metadata"
                  />
                )}
                {!previewItem.signed_url && (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-sm text-white/50">Preview unavailable</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-white/50">
                {formatDate(previewItem.uploaded_at)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

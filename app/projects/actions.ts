"use server";

import { createClient } from "@/lib/supabase/server";
import { callAIProvider } from "@/app/lib/ai/evaluation-service";

export type CreateProjectResult =
  | { success: true; projectId: string }
  | { success: false; message: string };

export type Project = {
  id: string;
  name: string;
  domain: string;
  problem_statement: string;
  refined_problem_statement: string | null;
  target_users: string | null;
  problem_evidence: string | null;
  learning_objective: string | null;
  current_stage: string;
  problem_definition_completed: boolean;
  ideation_completed: boolean;
  prototype_completed: boolean;
  github_url: string | null;
  website_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type GetProjectsResult =
  | { success: true; projects: Project[] }
  | { success: false; message: string };

export type ResearchNotes = {
  id: string;
  project_id: string;
  user_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type GetProjectResult =
  | { success: true; project: Project }
  | { success: false; message: string };

export type GetResearchNotesResult =
  | { success: true; notes: ResearchNotes | null }
  | { success: false; message: string };

export type SaveResearchNotesResult =
  | { success: true }
  | { success: false; message: string };

export type SaveProblemDefinitionResult =
  | { success: true }
  | { success: false; message: string };

function validateName(name: string): string | null {
  if (!name || name.trim().length < 1) {
    return "Project name is required.";
  }
  if (name.trim().length > 200) {
    return "Project name must be 200 characters or fewer.";
  }
  return null;
}

function validateProblemStatement(problemStatement: string): string | null {
  if (!problemStatement || problemStatement.trim().length < 1) {
    return "Problem statement is required.";
  }
  if (problemStatement.trim().length > 5000) {
    return "Problem statement must be 5000 characters or fewer.";
  }
  return null;
}

function validateLearningObjective(learningObjective: string): string | null {
  if (learningObjective && learningObjective.trim().length > 1000) {
    return "Learning objective must be 1000 characters or fewer.";
  }
  return null;
}

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  const name = String(formData.get("name") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim();
  const problemStatement = String(formData.get("problemStatement") ?? "").trim();
  const learningObjective = String(formData.get("learningObjective") ?? "").trim();

  const nameError = validateName(name);
  if (nameError) return { success: false, message: nameError };

  const problemStatementError = validateProblemStatement(problemStatement);
  if (problemStatementError) return { success: false, message: problemStatementError };

  const learningObjectiveError = validateLearningObjective(learningObjective);
  if (learningObjectiveError) return { success: false, message: learningObjectiveError };

  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to create a project." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      domain: domain || "Engineering & Software Innovation",
      problem_statement: problemStatement,
      learning_objective: learningObjective || null,
      current_stage: "research",
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, message: "Failed to create project. Please try again." };
  }

  return { success: true, projectId: data.id };
}

export async function getProjects(): Promise<GetProjectsResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view projects." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, domain, problem_statement, refined_problem_statement, target_users, problem_evidence, learning_objective, current_stage, problem_definition_completed, ideation_completed, prototype_completed, github_url, website_url, status, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return { success: false, message: "Failed to load projects. Please try again." };
  }

  return { success: true, projects: (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    problem_statement: row.problem_statement,
    refined_problem_statement: (row as Record<string, unknown>).refined_problem_statement as string | null,
    target_users: (row as Record<string, unknown>).target_users as string | null,
    problem_evidence: (row as Record<string, unknown>).problem_evidence as string | null,
    learning_objective: row.learning_objective,
    current_stage: row.current_stage,
    problem_definition_completed: (row as Record<string, unknown>).problem_definition_completed as boolean,
    ideation_completed: (row as Record<string, unknown>).ideation_completed as boolean,
    prototype_completed: (row as Record<string, unknown>).prototype_completed as boolean,
    github_url: (row as Record<string, unknown>).github_url as string | null,
    website_url: (row as Record<string, unknown>).website_url as string | null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) };
}

export async function getProject(projectId: string): Promise<GetProjectResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view this project." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, domain, problem_statement, refined_problem_statement, target_users, problem_evidence, learning_objective, current_stage, problem_definition_completed, ideation_completed, prototype_completed, github_url, website_url, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return { success: false, message: "Project not found or you do not have access to it." };
  }

  if (!data) {
    return { success: false, message: "Project not found or you do not have access to it." };
  }

  return {
    success: true,
    project: {
      id: data.id,
      name: data.name,
      domain: data.domain,
      problem_statement: data.problem_statement,
      refined_problem_statement: (data as Record<string, unknown>).refined_problem_statement as string | null,
      target_users: (data as Record<string, unknown>).target_users as string | null,
      problem_evidence: (data as Record<string, unknown>).problem_evidence as string | null,
      learning_objective: data.learning_objective,
      current_stage: data.current_stage,
      problem_definition_completed: (data as Record<string, unknown>).problem_definition_completed as boolean,
      ideation_completed: (data as Record<string, unknown>).ideation_completed as boolean,
      prototype_completed: (data as Record<string, unknown>).prototype_completed as boolean,
      github_url: (data as Record<string, unknown>).github_url as string | null,
      website_url: (data as Record<string, unknown>).website_url as string | null,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  };
}

export async function getResearchNotes(projectId: string): Promise<GetResearchNotesResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view research notes." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_research_notes")
    .select("id, project_id, user_id, notes, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: true, notes: null };
    }
    return { success: false, message: "Failed to load research notes." };
  }

  return {
    success: true,
    notes: {
      id: data.id,
      project_id: data.project_id,
      user_id: data.user_id,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  };
}

export async function saveResearchNotes(projectId: string, notes: string): Promise<SaveResearchNotesResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to save research notes." };
  }

  if (!notes || notes.trim().length < 1) {
    return { success: false, message: "Research notes cannot be empty." };
  }

  if (notes.trim().length > 10000) {
    return { success: false, message: "Research notes must be 10000 characters or fewer." };
  }

  const supabase = await createClient();

  const existing = await getResearchNotes(projectId);
  if (!existing.success) {
    return { success: false, message: existing.message };
  }

  if (existing.notes) {
    const { error } = await supabase
      .from("project_research_notes")
      .update({ notes: notes.trim(), updated_at: new Date().toISOString() })
      .eq("id", existing.notes.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, message: "Failed to update research notes." };
    }
  } else {
    const { error } = await supabase
      .from("project_research_notes")
      .insert({
        project_id: projectId,
        user_id: user.id,
        notes: notes.trim(),
      });

    if (error) {
      return { success: false, message: "Failed to save research notes." };
    }
  }

  return { success: true };
}

export type IdeationIdea = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  expected_benefit: string;
  feasibility: string;
  potential_limitations: string;
  is_preferred: boolean;
  preferred_rationale: string;
  created_at: string;
  updated_at: string;
};

export type GetIdeasResult =
  | { success: true; ideas: IdeationIdea[] }
  | { success: false; message: string };

export type SaveIdeaResult =
  | { success: true; ideaId: string }
  | { success: false; message: string };

export type DeleteIdeaResult =
  | { success: true }
  | { success: false; message: string };

export type SelectPreferredIdeaResult =
  | { success: true }
  | { success: false; message: string };

export async function saveProblemDefinition(projectId: string, refinedProblemStatement: string, targetUsers: string, problemEvidence: string): Promise<SaveProblemDefinitionResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to save problem definition." };
  }

  if (!refinedProblemStatement || refinedProblemStatement.trim().length < 1) {
    return { success: false, message: "Refined problem statement is required." };
  }

  if (refinedProblemStatement.trim().length > 5000) {
    return { success: false, message: "Refined problem statement must be 5000 characters or fewer." };
  }

  if (targetUsers && targetUsers.trim().length > 2000) {
    return { success: false, message: "Target users must be 2000 characters or fewer." };
  }

  if (problemEvidence && problemEvidence.trim().length > 5000) {
    return { success: false, message: "Problem evidence must be 5000 characters or fewer." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({
      refined_problem_statement: refinedProblemStatement.trim(),
      target_users: targetUsers.trim() || null,
      problem_evidence: problemEvidence.trim() || null,
      problem_definition_completed: true,
      current_stage: "problem_definition",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "Failed to save problem definition." };
  }

  return { success: true };
}

export async function getIdeas(projectId: string): Promise<GetIdeasResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view ideas." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_ideas")
    .select("id, project_id, user_id, title, description, expected_benefit, feasibility, potential_limitations, is_preferred, preferred_rationale, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, message: "Failed to load ideas." };
  }

  return {
    success: true,
    ideas: (data ?? []).map((row) => ({
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      expected_benefit: row.expected_benefit,
      feasibility: row.feasibility,
      potential_limitations: row.potential_limitations,
      is_preferred: row.is_preferred,
      preferred_rationale: row.preferred_rationale,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
  };
}

export async function createIdea(
  projectId: string,
  title: string,
  description: string,
  expectedBenefit: string,
  feasibility: string,
  potentialLimitations: string,
): Promise<SaveIdeaResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to create an idea." };
  }

  if (!title || title.trim().length < 1) {
    return { success: false, message: "Idea title is required." };
  }
  if (title.trim().length > 200) {
    return { success: false, message: "Idea title must be 200 characters or fewer." };
  }
  if (!description || description.trim().length < 1) {
    return { success: false, message: "Idea description is required." };
  }
  if (description.trim().length > 5000) {
    return { success: false, message: "Idea description must be 5000 characters or fewer." };
  }
  if (!expectedBenefit || expectedBenefit.trim().length < 1) {
    return { success: false, message: "Expected benefit is required." };
  }
  if (expectedBenefit.trim().length > 2000) {
    return { success: false, message: "Expected benefit must be 2000 characters or fewer." };
  }
  if (!feasibility || feasibility.trim().length < 1) {
    return { success: false, message: "Feasibility is required." };
  }
  if (feasibility.trim().length > 1000) {
    return { success: false, message: "Feasibility must be 1000 characters or fewer." };
  }
  if (!potentialLimitations || potentialLimitations.trim().length < 1) {
    return { success: false, message: "Potential limitations is required." };
  }
  if (potentialLimitations.trim().length > 2000) {
    return { success: false, message: "Potential limitations must be 2000 characters or fewer." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_ideas")
    .insert({
      project_id: projectId,
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      expected_benefit: expectedBenefit.trim(),
      feasibility: feasibility.trim(),
      potential_limitations: potentialLimitations.trim(),
      is_preferred: false,
      preferred_rationale: "",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, message: "Failed to create idea." };
  }

  return { success: true, ideaId: data.id };
}

export async function updateIdea(
  ideaId: string,
  title: string,
  description: string,
  expectedBenefit: string,
  feasibility: string,
  potentialLimitations: string,
): Promise<SaveIdeaResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to update an idea." };
  }

  if (!title || title.trim().length < 1) {
    return { success: false, message: "Idea title is required." };
  }
  if (title.trim().length > 200) {
    return { success: false, message: "Idea title must be 200 characters or fewer." };
  }
  if (!description || description.trim().length < 1) {
    return { success: false, message: "Idea description is required." };
  }
  if (description.trim().length > 5000) {
    return { success: false, message: "Idea description must be 5000 characters or fewer." };
  }
  if (!expectedBenefit || expectedBenefit.trim().length < 1) {
    return { success: false, message: "Expected benefit is required." };
  }
  if (expectedBenefit.trim().length > 2000) {
    return { success: false, message: "Expected benefit must be 2000 characters or fewer." };
  }
  if (!feasibility || feasibility.trim().length < 1) {
    return { success: false, message: "Feasibility is required." };
  }
  if (feasibility.trim().length > 1000) {
    return { success: false, message: "Feasibility must be 1000 characters or fewer." };
  }
  if (!potentialLimitations || potentialLimitations.trim().length < 1) {
    return { success: false, message: "Potential limitations is required." };
  }
  if (potentialLimitations.trim().length > 2000) {
    return { success: false, message: "Potential limitations must be 2000 characters or fewer." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("project_ideas")
    .update({
      title: title.trim(),
      description: description.trim(),
      expected_benefit: expectedBenefit.trim(),
      feasibility: feasibility.trim(),
      potential_limitations: potentialLimitations.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ideaId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "Failed to update idea." };
  }

  return { success: true, ideaId };
}

export async function deleteIdea(ideaId: string): Promise<DeleteIdeaResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to delete an idea." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("project_ideas")
    .delete()
    .eq("id", ideaId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "Failed to delete idea." };
  }

  return { success: true };
}

export async function selectPreferredIdea(
  projectId: string,
  ideaId: string,
  rationale: string,
): Promise<SelectPreferredIdeaResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to select a preferred idea." };
  }

  if (!rationale || rationale.trim().length < 1) {
    return { success: false, message: "Selection rationale is required." };
  }
  if (rationale.trim().length > 2000) {
    return { success: false, message: "Selection rationale must be 2000 characters or fewer." };
  }

  const supabase = await createClient();

  // First, unselect any previously preferred idea for this project
  const { error: unsetError } = await supabase
    .from("project_ideas")
    .update({ is_preferred: false, preferred_rationale: "" })
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (unsetError) {
    return { success: false, message: "Failed to select preferred idea." };
  }

  // Then select the chosen idea
  const { error: setError } = await supabase
    .from("project_ideas")
    .update({
      is_preferred: true,
      preferred_rationale: rationale.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ideaId)
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (setError) {
    return { success: false, message: "Failed to select preferred idea." };
  }

  // Mark ideation as completed on the project
  const { error: projectError } = await supabase
    .from("projects")
    .update({
      ideation_completed: true,
      current_stage: "ideation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (projectError) {
    return { success: false, message: "Failed to mark ideation complete." };
  }

  return { success: true };
}

export type PrototypeEvidence = {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  description: string | null;
  signed_url: string | null;
  uploaded_at: string;
  updated_at: string;
};

export type GetPrototypeEvidenceResult =
  | { success: true; evidence: PrototypeEvidence[] }
  | { success: false; message: string };

export type UploadPrototypeEvidenceResult =
  | {
      success: true;
      evidenceIds: string[];
      uploadedCount: number;
      totalCount: number;
      failedFiles: Array<{ index: number; fileName: string; message: string }>;
    }
  | { success: false; message: string };

export type DeletePrototypeEvidenceResult =
  | { success: true }
  | { success: false; message: string };

export type SaveProjectExternalLinksResult =
  | { success: true }
  | { success: false; message: string };

const ALLOWED_FILE_TYPES = [
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function getPrototypeEvidence(
  projectId: string,
): Promise<GetPrototypeEvidenceResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view evidence." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_prototype_evidence")
    .select("id, project_id, user_id, file_name, file_type, file_size, storage_path, description, uploaded_at, updated_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return { success: false, message: "Failed to load prototype evidence." };
  }

  return {
    success: true,
    evidence: await Promise.all(
      (data ?? []).map(async (row) => {
        let signedUrl: string | null = null;
        try {
          const { data: urlData } = await supabase.storage
            .from("prototype-evidence")
            .createSignedUrl(row.storage_path, 3600);
          signedUrl = urlData?.signedUrl ?? null;
        } catch {
          // Signed URL generation failure is non-fatal; evidence still listed
        }
        return {
          id: row.id,
          project_id: row.project_id,
          user_id: row.user_id,
          file_name: row.file_name,
          file_type: row.file_type,
          file_size: row.file_size,
          storage_path: row.storage_path,
          description: row.description,
          signed_url: signedUrl,
          uploaded_at: row.uploaded_at,
          updated_at: row.updated_at,
        };
      }),
    ),
  };
}

export async function uploadPrototypeEvidence(
  projectId: string,
  files: File[],
  descriptions: string[],
): Promise<UploadPrototypeEvidenceResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to upload evidence." };
  }

  if (!files || files.length < 1) {
    return { success: false, message: "No files provided." };
  }

  if (descriptions.length !== files.length) {
    return {
      success: false,
      message: "Description count does not match file count.",
    };
  }

  const supabase = await createClient();

  const evidenceIds: string[] = [];
  const failedFiles: Array<{ index: number; fileName: string; message: string }> = [];

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    const description = descriptions[fileIndex] ?? "";

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      failedFiles.push({
        index: fileIndex,
        fileName: file.name,
        message:
          "Unsupported file type. Please upload images (PNG, JPEG, WebP, GIF) or videos (MP4, WebM, OGG, MOV).",
      });
      continue;
    }

    if (file.size < 1) {
      failedFiles.push({
        index: fileIndex,
        fileName: file.name,
        message: "File is empty.",
      });
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      failedFiles.push({
        index: fileIndex,
        fileName: file.name,
        message: "File is too large. Maximum size is 50 MB.",
      });
      continue;
    }

    if (description.trim().length > 1000) {
      failedFiles.push({
        index: fileIndex,
        fileName: file.name,
        message: "Description must be 1000 characters or fewer.",
      });
      continue;
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("prototype-evidence")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      failedFiles.push({
        index: fileIndex,
        fileName: file.name,
        message: "Failed to upload file to storage. Please try again.",
      });
      continue;
    }

    const { data: insertData, error: insertError } = await supabase
      .from("project_prototype_evidence")
      .insert({
        project_id: projectId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        description: description.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      // Attempt to clean up the uploaded file if the database insert fails
      await supabase.storage.from("prototype-evidence").remove([storagePath]);
      failedFiles.push({
        index: fileIndex,
        fileName: file.name,
        message: "Failed to save evidence record. Please try again.",
      });
      continue;
    }

    if (insertData) {
      evidenceIds.push(insertData.id);
    }
  }

  return {
    success: true,
    evidenceIds,
    uploadedCount: evidenceIds.length,
    totalCount: files.length,
    failedFiles,
  };
}

export async function deletePrototypeEvidence(
  evidenceId: string,
): Promise<DeletePrototypeEvidenceResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to delete evidence." };
  }

  const supabase = await createClient();

  // Fetch the evidence record to get the storage path before deleting
  const { data: evidence, error: fetchError } = await supabase
    .from("project_prototype_evidence")
    .select("storage_path")
    .eq("id", evidenceId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !evidence) {
    return {
      success: false,
      message: "Evidence not found or you do not have access to it.",
    };
  }

  const { error: deleteError } = await supabase
    .from("project_prototype_evidence")
    .delete()
    .eq("id", evidenceId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { success: false, message: "Failed to delete evidence." };
  }

  // Attempt to remove the file from storage (best effort; do not fail if this fails)
  await supabase.storage.from("prototype-evidence").remove([
    evidence.storage_path,
  ]);

  return { success: true };
}

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/;

export async function saveProjectGitHubUrl(
  projectId: string,
  githubUrl: string | null,
): Promise<SaveProjectExternalLinksResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to save links." };
  }

  const normalizedGitHubUrl = githubUrl?.trim() || null;

  if (normalizedGitHubUrl && !GITHUB_URL_REGEX.test(normalizedGitHubUrl)) {
    return {
      success: false,
      message:
        "Please enter a valid public GitHub repository URL (e.g., https://github.com/owner/repo).",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({
      github_url: normalizedGitHubUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "Failed to save GitHub URL. Please try again." };
  }

  return { success: true };
}

export async function saveProjectWebsiteUrl(
  projectId: string,
  websiteUrl: string | null,
): Promise<SaveProjectExternalLinksResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to save links." };
  }

  const normalizedWebsiteUrl = websiteUrl?.trim() || null;

  if (normalizedWebsiteUrl) {
    try {
      const url = new URL(normalizedWebsiteUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return {
          success: false,
          message: "Website URL must use http or https protocol.",
        };
      }
    } catch {
      return { success: false, message: "Please enter a valid website URL." };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({
      website_url: normalizedWebsiteUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "Failed to save website URL. Please try again." };
  }

  return { success: true };
}

export type ProjectEvaluationReport = {
  id: string;
  project_id: string;
  user_id: string;
  evidence_context: unknown;
  report_content: unknown;
  overall_assessment: string | null;
  completeness_status: string;
  created_at: string;
};

export type GetProjectEvaluationReportsResult =
  | { success: true; reports: ProjectEvaluationReport[] }
  | { success: false; message: string };

export type GetProjectEvaluationReportResult =
  | { success: true; report: ProjectEvaluationReport }
  | { success: false; message: string };

export type GenerateProjectEvaluationResult =
  | { success: true; report: ProjectEvaluationReport }
  | { success: false; message: string };

export async function generateProjectEvaluation(
  projectId: string,
): Promise<GenerateProjectEvaluationResult> {
  "use server";

  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to request an evaluation." };
  }

  const supabase = await createClient();

  // Fetch the project to verify ownership and get project details
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, domain, problem_statement, learning_objective, github_url, website_url")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    return {
      success: false,
      message: "Project not found or you do not have access to it.",
    };
  }

  // Fetch prototype evidence WITH storage_path for image retrieval
  const { data: rawEvidence } = await supabase
    .from("project_prototype_evidence")
    .select("id, file_name, file_type, description, storage_path")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  // Retrieve actual image content from Supabase Storage server-side
  const { retrievePrototypeEvidence } = await import(
    "@/app/lib/evidence/evidence-retriever"
  );
  const prototypeEvidence = await retrievePrototypeEvidence(
    supabase,
    (rawEvidence ?? []).map((e) => ({
      file_name: e.file_name,
      file_type: e.file_type,
      description: e.description,
      storage_path: e.storage_path,
      signed_url: null,
    })),
  );

  // Retrieve GitHub repository content if URL exists
  const { retrieveGitHubRepository } = await import(
    "@/app/lib/evidence/evidence-retriever"
  );
  let githubContent = null;
  if (project.github_url) {
    githubContent = await retrieveGitHubRepository(project.github_url);
  }

  // Retrieve live website content if URL exists
  const { retrieveWebsiteContent } = await import(
    "@/app/lib/evidence/evidence-retriever"
  );
  let websiteContent = null;
  if (project.website_url) {
    websiteContent = await retrieveWebsiteContent(project.website_url);
  }

  // Build evaluation context with actual evidence content
  const context = {
    projectName: project.name,
    domain: project.domain || "",
    problemStatement: project.problem_statement || null,
    learningObjective: project.learning_objective || null,
    hasResearchNotes: false,
    prototypeEvidence,
    githubContent,
    websiteContent,
  };

  // Build evidence context for storage (metadata only, not base64 image data)
  const evidenceContext = {
    has_prototype_evidence: prototypeEvidence.length > 0,
    prototype_evidence_count: prototypeEvidence.length,
    prototype_evidence_retrieved: prototypeEvidence.filter(
      (e) => e.retrieval_status === "retrieved",
    ).length,
    has_github_url: Boolean(project.github_url),
    github_retrieval_status: githubContent?.retrieval_status,
    has_website_url: Boolean(project.website_url),
    website_retrieval_status: websiteContent?.retrieval_status,
    has_research_notes: context.hasResearchNotes,
    submitted_at: new Date().toISOString(),
  };

  // Generate the evaluation using the AI service with actual evidence content
  let reportContent;
  let completenessStatus = "not_verifiable";
  let overallAssessment: string | null = null;

  try {
    const { generateEvaluation } = await import("@/app/lib/ai/evaluation-service");
    const report = await generateEvaluation(context);
    reportContent = report;
    completenessStatus = report.completeness_assessment;
    overallAssessment = report.overall_evaluation;
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Evaluation failed: ${error.message}`
          : "Evaluation failed due to an unexpected error.",
    };
  }

  // Save the evaluation report to the database
  const { data: savedReport, error: saveError } = await supabase
    .from("project_evaluation_reports")
    .insert({
      project_id: projectId,
      user_id: user.id,
      evidence_context: evidenceContext,
      report_content: reportContent,
      overall_assessment: overallAssessment,
      completeness_status: completenessStatus,
    })
    .select("id, project_id, user_id, evidence_context, report_content, overall_assessment, completeness_status, created_at")
    .single();

  if (saveError) {
    return { success: false, message: "Failed to save evaluation report." };
  }

  return {
    success: true,
    report: {
      id: savedReport.id,
      project_id: savedReport.project_id,
      user_id: savedReport.user_id,
      evidence_context: savedReport.evidence_context,
      report_content: savedReport.report_content,
      overall_assessment: savedReport.overall_assessment,
      completeness_status: savedReport.completeness_status,
      created_at: savedReport.created_at,
    },
  };
}

export async function getProjectEvaluationReports(
  projectId: string,
): Promise<GetProjectEvaluationReportsResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view evaluations." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_evaluation_reports")
    .select("id, project_id, user_id, evidence_context, report_content, overall_assessment, completeness_status, created_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, message: "Failed to load evaluation reports." };
  }

  return {
    success: true,
    reports: (data ?? []).map((row) => ({
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      evidence_context: row.evidence_context,
      report_content: row.report_content,
      overall_assessment: row.overall_assessment,
      completeness_status: row.completeness_status,
      created_at: row.created_at,
    })),
  };
}

export async function getProjectEvaluationReport(
  reportId: string,
): Promise<GetProjectEvaluationReportResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view this evaluation." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_evaluation_reports")
    .select("id, project_id, user_id, evidence_context, report_content, overall_assessment, completeness_status, created_at")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return {
      success: false,
      message: "Evaluation report not found or you do not have access to it.",
    };
  }

  return {
    success: true,
    report: {
      id: data.id,
      project_id: data.project_id,
      user_id: data.user_id,
      evidence_context: data.evidence_context,
      report_content: data.report_content,
      overall_assessment: data.overall_assessment,
      completeness_status: data.completeness_status,
      created_at: data.created_at,
    },
  };
}

export type RYConversation = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type RYMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type GetRYConversationResult =
  | { success: true; conversation: RYConversation }
  | { success: false; message: string };

export type GetRYMessagesResult =
  | { success: true; messages: RYMessage[] }
  | { success: false; message: string };

export type SendRYMessageResult =
  | { success: true; message: RYMessage }
  | { success: false; message: string };

export async function getOrCreateRYConversation(
  projectId: string,
): Promise<GetRYConversationResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to access RY." };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("ry_conversations")
    .select("id, project_id, user_id, title, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (existingError && existingError.code !== "PGRST116") {
    return { success: false, message: existingError.message };
  }

  if (existing) {
    return {
      success: true,
      conversation: {
        id: existing.id,
        project_id: existing.project_id,
        user_id: existing.user_id,
        title: existing.title,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      },
    };
  }

  const { data: newConv, error: createError } = await supabase
    .from("ry_conversations")
    .insert({
      project_id: projectId,
      user_id: user.id,
      title: "RY Conversation",
    })
    .select("id, project_id, user_id, title, created_at, updated_at")
    .single();

  if (createError) {
    return { success: false, message: "Failed to create conversation." };
  }

  return {
    success: true,
    conversation: {
      id: newConv.id,
      project_id: newConv.project_id,
      user_id: newConv.user_id,
      title: newConv.title,
      created_at: newConv.created_at,
      updated_at: newConv.updated_at,
    },
  };
}

export async function getRYMessages(
  conversationId: string,
): Promise<GetRYMessagesResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to view messages." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ry_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, message: "Failed to load messages." };
  }

  return {
    success: true,
    messages: (data ?? []).map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      role: row.role,
      content: row.content,
      created_at: row.created_at,
    })),
  };
}

export async function sendRYMessage(
  projectId: string,
  conversationId: string,
  content: string,
): Promise<SendRYMessageResult> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "You must be logged in to send messages." };
  }

  if (!content || content.trim().length < 1) {
    return { success: false, message: "Message cannot be empty." };
  }

  const supabase = await createClient();

  // Verify the conversation exists and belongs to this user AND project
  const { data: conv, error: convError } = await supabase
    .from("ry_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .single();

  if (convError || !conv) {
    return { success: false, message: "Conversation not found or you do not have access to it." };
  }

  const { error: userMsgError } = await supabase
    .from("ry_messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: content.trim(),
    })
    .select("id, conversation_id, role, content, created_at")
    .single();

  if (userMsgError) {
    return { success: false, message: "Failed to send message." };
  }

  const context = await buildRYContext(projectId);

  const systemPrompt = buildRYSystemPrompt(context);
  const userContent: Array<{ type: "text"; text: string }> = [
    { type: "text" as const, text: content.trim() },
  ];

  let aiResponse: string;
  try {
    aiResponse = await callAIProvider(systemPrompt, userContent);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get AI response.",
    };
  }

  const { data: assistantMsg, error: assistantMsgError } = await supabase
    .from("ry_messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: aiResponse,
    })
    .select("id, conversation_id, role, content, created_at")
    .single();

  if (assistantMsgError) {
    return { success: false, message: "Failed to save AI response." };
  }

  return {
    success: true,
    message: {
      id: assistantMsg.id,
      conversation_id: assistantMsg.conversation_id,
      role: assistantMsg.role,
      content: assistantMsg.content,
      created_at: assistantMsg.created_at,
    },
  };
}

async function buildRYContext(
  projectId: string,
): Promise<{
  projectName: string;
  domain: string;
  problemStatement: string | null;
  learningObjective: string | null;
  currentStage: string;
  githubUrl: string | null;
  websiteUrl: string | null;
  researchNotes: string | null;
  ideas: Array<{
    title: string;
    description: string;
    expected_benefit: string;
    feasibility: string;
    potential_limitations: string;
    is_preferred: boolean;
    preferred_rationale: string;
  }>;
  latestEvaluation: unknown | null;
  prototypeEvidence: Array<{
    file_name: string;
    file_type: string;
    description: string | null;
  }>;
}> {
  const user = await getSession();
  if (!user) {
    throw new Error("User not authenticated");
  }
  const supabase = await createClient();

  // Run all five independent lookups concurrently
  const [
    projectResult,
    researchNotesResult,
    ideasResult,
    evalResultResult,
    prototypeEvidenceResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, domain, problem_statement, refined_problem_statement, target_users, problem_evidence, learning_objective, current_stage, github_url, website_url")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("project_research_notes")
      .select("notes")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("project_ideas")
      .select("title, description, expected_benefit, feasibility, potential_limitations, is_preferred, preferred_rationale")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("project_evaluation_reports")
      .select("report_content, created_at")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("project_prototype_evidence")
      .select("file_name, file_type, description")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false })
      .limit(5),
  ]);

  const project = projectResult.data;
  const researchNotes = researchNotesResult.data;
  const ideas = ideasResult.data ?? [];
  const evalResult = evalResultResult.data;
  const prototypeEvidence = prototypeEvidenceResult.data;

  return {
    projectName: project?.name || "",
    domain: project?.domain || "",
    problemStatement: project?.problem_statement || null,
    learningObjective: project?.learning_objective || null,
    currentStage: project?.current_stage || "research",
    githubUrl: project?.github_url || null,
    websiteUrl: project?.website_url || null,
    researchNotes: researchNotes?.[0]?.notes?.slice(0, 2000) || null,
    ideas: (ideas || []).map((e) => ({
      title: e.title,
      description: e.description?.slice(0, 300) || "",
      expected_benefit: e.expected_benefit,
      feasibility: e.feasibility,
      potential_limitations: e.potential_limitations,
      is_preferred: e.is_preferred,
      preferred_rationale: e.preferred_rationale,
    })),
    latestEvaluation: (() => {
      const raw = evalResult?.[0]?.report_content;
      if (raw === null || raw === undefined) return null;
      if (typeof raw === "string") return raw.slice(0, 2000);
      try {
        return JSON.stringify(raw).slice(0, 2000);
      } catch {
        return String(raw).slice(0, 2000);
      }
    })(),
    prototypeEvidence: (prototypeEvidence ?? []).map((e) => ({
      file_name: e.file_name,
      file_type: e.file_type,
      description: e.description?.slice(0, 300) || "",
    })),
  };
}

function buildRYSystemPrompt(context: {
  projectName: string;
  domain: string;
  problemStatement: string | null;
  learningObjective: string | null;
  currentStage: string;
  githubUrl: string | null;
  websiteUrl: string | null;
  researchNotes: string | null;
  ideas: Array<{
    title: string;
    description: string;
    expected_benefit: string;
    feasibility: string;
    potential_limitations: string;
    is_preferred: boolean;
    preferred_rationale: string;
  }>;
  latestEvaluation: unknown | null;
  prototypeEvidence: Array<{
    file_name: string;
    file_type: string;
    description: string | null;
  }>;
}): string {
  const stageGuidance: Record<string, string> = {
    research: "Help the student identify and research a real problem. Ask about what problem they care about, what evidence they've found, and what questions they still need to answer. Encourage evidence-based thinking rather than jumping to solutions.",
    problem_definition: "Help the student refine their problem statement. Ask about who experiences the problem, what evidence supports it, and why it matters. Guide them toward a clear, specific, and evidence-grounded problem definition.",
    ideation: "Help the student generate and evaluate ideas. Encourage them to consider multiple approaches, weigh benefits against feasibility and limitations, and select the most promising idea. Don't pick the idea for them—help them think through the trade-offs.",
    prototype_evaluation: "Help the student evaluate their prototype. Ask about what they built, what evidence they have, and what they learned. Help them interpret evaluation feedback and plan next steps. Don't do the evaluation for them.",
  };

  const stageGuidanceText = stageGuidance[context.currentStage] || stageGuidance.research;

  return `You are RY, an AI coach for STRIDE, an experiential learning platform. You are a mentor and thinking partner who helps students learn how to think, build, test, and improve—not merely generate answers or do their work for them.

STRIDE CONTEXT:
- Project: ${context.projectName}
- Domain: ${context.domain || "Not specified"}
- Current Stage: ${context.currentStage}
- Problem Statement: ${context.problemStatement || "Not yet defined"}
- Learning Objective: ${context.learningObjective || "Not specified"}

RY CONVERSATION GOAL:
Provide stage-specific, contextual coaching grounded in the student's actual project evidence. Be encouraging but challenging. Ask questions that make them think deeper. Help them overcome blockers without doing the work for them. Reference their actual evidence (research, ideas, prototype, evaluation) when giving advice.

STAGE-SPECIFIC FOCUS:
${stageGuidanceText}

EVIDENCE AVAILABLE:
- Research Notes: ${context.researchNotes || "None saved yet"}
- Ideas: ${context.ideas.length} idea(s) saved${context.ideas.length > 0 ? ` (Preferred: ${context.ideas.find((i) => i.is_preferred)?.title || "none selected"})` : ""}
- Latest Evaluation: ${context.latestEvaluation ? "Available" : "Not yet generated"}
- Prototype Evidence: ${context.prototypeEvidence.length} file(s) uploaded

RULES:
- Never fabricate evidence, test results, or success claims.
- Never do the student's work for them—ask questions, suggest directions, challenge assumptions.
- Reference actual evidence from the project when giving feedback.
- Adapt your tone to be supportive but rigorous.
- If no AI evidence is available, be honest about what can and cannot be assessed.
- Keep responses concise and focused.`;
}

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

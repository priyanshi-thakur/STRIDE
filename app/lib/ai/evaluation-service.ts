/**
 * STRIDE AI Evaluation Service
 *
 * Provides a clean abstraction for AI-powered project evaluation.
 * All AI calls run server-side only. API keys and secrets are never
 * exposed to the browser.
 *
 * Supported providers (configured via environment variables):
 *   AI_PROVIDER=ollama   -> OpenAI-compatible chat completions endpoint
 *   AI_PROVIDER=openai   -> OpenAI chat completions endpoint
 *   AI_PROVIDER=anthropic -> Anthropic messages endpoint
 *   AI_PROVIDER=gemini   -> Google Gemini via OpenAI-compatible endpoint
 *
 * Required env vars (server-side only):
 *   AI_PROVIDER   - ollama | openai | anthropic | gemini
 *   AI_BASE_URL   - base URL for the AI provider API
 *   AI_API_KEY    - API key for the provider (if required)
 *   AI_MODEL      - model identifier to use
 *
 * If no AI provider is configured, the service returns a clear
 * limitation message rather than fabricating evaluation results.
 */

export interface EvaluationReport {
  project_overview: {
    project_name: string;
    submitted_evidence: string[];
    available_technologies: string[];
    project_context: string;
  };
  strengths: Array<{
    observation: string;
    evidence: string;
  }>;
  weaknesses: Array<{
    observation: string;
    why_it_matters: string;
  }>;
  missing_features: string[];
  technical_assessment: {
    architecture: string;
    code_quality: string;
    usability: string;
    functionality: string;
    other: string;
  };
  issues_and_severity: Array<{
    issue: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
  completeness_assessment: "complete" | "pending" | "not_verifiable";
  recommended_improvements: string[];
  overall_evaluation: string;
}

export interface RetrievedImageEvidence {
  file_name: string;
  file_type: string;
  description: string | null;
  data_uri: string | null; // base64 data URI for vision-capable models
  retrieval_status: "retrieved" | "not_retrievable" | "not_image";
  retrieval_error?: string;
}

export interface RetrievedGitHubContent {
  repo_url: string;
  owner: string;
  repo: string;
  retrieval_status: "retrieved" | "not_retrievable" | "inaccessible";
  readme_content?: string;
  readme_error?: string;
  file_tree?: string[];
  tree_error?: string;
  error?: string;
}

export interface RetrievedWebsiteContent {
  url: string;
  retrieval_status: "retrieved" | "not_retrievable" | "blocked" | "inaccessible";
  html_text?: string;
  title?: string;
  description?: string;
  links?: string[];
  error?: string;
}

export interface EvaluationContext {
  projectName: string;
  domain: string;
  problemStatement: string | null;
  learningObjective: string | null;
  hasResearchNotes: boolean;
  prototypeEvidence: RetrievedImageEvidence[];
  githubContent: RetrievedGitHubContent | null;
  websiteContent: RetrievedWebsiteContent | null;
}

interface AIProviderConfig {
  provider: string | undefined;
  baseUrl: string | undefined;
  apiKey: string | undefined;
  model: string | undefined;
  maxTokens?: number;
}

function getProviderConfig(): AIProviderConfig {
  return {
    provider: process.env.AI_PROVIDER,
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
    maxTokens: process.env.AI_MAX_TOKENS
      ? parseInt(process.env.AI_MAX_TOKENS, 10)
      : 1000,
  };
}

function isProviderConfigured(config: AIProviderConfig): boolean {
  return Boolean(config.provider && config.baseUrl && config.model);
}

function supportsVision(config: AIProviderConfig): boolean {
  // Heuristic: vision-capable models typically have "vision", "gpt-4v", "gpt-4o",
  // "claude-3", "claude-3-5", "llava", "bakllava", "gemini-1.5", "gemini-2.0",
  // etc. in their name.
  const model = (config.model || "").toLowerCase();
  const visionKeywords = [
    "vision",
    "gpt-4v",
    "gpt-4o",
    "claude-3",
    "claude-3-5",
    "llava",
    "bakllava",
    "moondream",
    "cogvlm",
    "instructblip",
    "deepseek-vl",
    "gemini-1.5",
    "gemini-2.0",
  ];
  return visionKeywords.some((kw) => model.includes(kw));
}

async function callOllamaOrOpenAICompatible(
  config: AIProviderConfig,
  systemPrompt: string,
  userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
): Promise<string> {
  const baseUrl = config.baseUrl!.replace(/\/$/, "");
  const url = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const canUseVision = supportsVision(config);

  // Build content: if vision is not supported, drop image parts entirely
  // and add a text note so images are not silently sent to a model that
  // cannot process them.
  const imageCount = userContent.filter((c) => c.type === "image_url").length;
  let visionNote = "";
  if (!canUseVision && imageCount > 0) {
    visionNote = `\n\nNOTE: ${imageCount} image(s) were submitted but this model (${config.model}) does not support image analysis. Image content could not be evaluated visually. Only filenames and descriptions are available.`;
  }

  const textParts = userContent.filter((c) => c.type === "text");
  const imageParts = userContent.filter((c) => c.type === "image_url");

  // Build content: when vision is supported, send images alongside text.
  // When vision is not supported, drop image parts and add a note.
  let imageBlocks: Array<{ type: "image_url"; image_url: { url: string } }> = [];
  if (canUseVision) {
    imageBlocks = imageParts;
  }

  const finalContent = [
    ...textParts,
    ...imageBlocks,
    ...(visionNote ? [{ type: "text", text: visionNote }] : []),
  ];

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalContent },
      ],
      temperature: 0.3,
      stream: false,
      max_tokens: config.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`AI provider error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(
  config: AIProviderConfig,
  systemPrompt: string,
  userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
): Promise<string> {
  const baseUrl = config.baseUrl!.replace(/\/$/, "");
  const url = `${baseUrl}/messages`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (config.apiKey) {
    headers["x-api-key"] = config.apiKey;
  }

  const canUseVision = supportsVision(config);

  // Build content: if vision is not supported, drop image parts entirely
  // and add a text note so images are not silently sent to a model that
  // cannot process them.
  const imageCount = userContent.filter((c) => c.type === "image_url").length;
  let visionNote = "";
  if (!canUseVision && imageCount > 0) {
    visionNote = `\n\nNOTE: ${imageCount} image(s) were submitted but this model (${config.model}) does not support image analysis. Image content could not be evaluated visually. Only filenames and descriptions are available.`;
  }

  const textParts = userContent.filter((c) => c.type === "text");

  // Convert image_url parts to Anthropic image blocks only when vision is supported.
  const imageBlocks = canUseVision
    ? userContent
        .filter((c) => c.type === "image_url")
        .map((c) => {
        const match = c.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return { type: "text", text: "[Image could not be processed: invalid data URI]" };
        }
        return {
          type: "image",
          source: {
            type: "base64",
            media_type: match[1],
            data: match[2],
          },
        };
      })
    : [];

  const finalContent = [
    ...textParts,
    ...imageBlocks,
    ...(visionNote ? [{ type: "text", text: visionNote }] : []),
  ];

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: "user", content: finalContent },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`AI provider error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

export async function callAIProvider(
  systemPrompt: string,
  userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
): Promise<string> {
  const config = getProviderConfig();

  if (!isProviderConfigured(config)) {
    throw new Error(
      "No AI provider is configured. Set AI_PROVIDER, AI_BASE_URL, AI_API_KEY, and AI_MODEL environment variables to enable AI-powered evaluation.",
    );
  }

  switch (config.provider) {
    case "anthropic":
      return callAnthropic(config, systemPrompt, userContent);
    case "ollama":
    case "openai":
    case "gemini":
      return callOllamaOrOpenAICompatible(config, systemPrompt, userContent);
    default:
      throw new Error(
        `Unknown AI provider: ${config.provider}. Supported providers: ollama, openai, anthropic, gemini.`,
      );
  }
}

export function buildEvaluationSystemPrompt(): string {
  return `You are an experienced software engineering mentor and evaluator. Your role is to evaluate a student's project based on the evidence they have submitted, and produce a structured, honest, and constructive evaluation report.

CRITICAL RULES:
- Evaluate only what can genuinely be observed from the submitted evidence.
- Do NOT claim hidden functionality works merely because a screenshot looks correct.
- Do NOT claim code was executed or tests passed unless the evidence genuinely demonstrates it.
- Distinguish between what was actually tested/observed and what could only be inferred.
- If evidence is missing or inaccessible, state that clearly — do not treat missing evidence as project failure.
- Never fabricate evidence, test results, citations, or success claims.
- Be specific and reference the actual evidence submitted.
- Do not invent numerical scores or claim certainty without sufficient evidence.
- For each finding, indicate whether it is a "Verified observation", "Reasonable inference", "Not verifiable", or "Not submitted".

Respond with a valid JSON object matching this exact schema:
{
  "project_overview": {
    "project_name": "string",
    "submitted_evidence": ["string"],
    "available_technologies": ["string"],
    "project_context": "string"
  },
  "strengths": [
    {"observation": "string", "evidence": "string"}
  ],
  "weaknesses": [
    {"observation": "string", "why_it_matters": "string"}
  ],
  "missing_features": ["string"],
  "technical_assessment": {
    "architecture": "string",
    "code_quality": "string",
    "usability": "string",
    "functionality": "string",
    "other": "string"
  },
  "issues_and_severity": [
    {"issue": "string", "severity": "critical|high|medium|low"}
  ],
  "completeness_assessment": "complete|pending|not_verifiable",
  "recommended_improvements": ["string"],
  "overall_evaluation": "string"
}

Return ONLY the JSON object, no markdown code fences, no additional text.`;
}

export function buildEvaluationUserPrompt(context: EvaluationContext): Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> {
  const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];

  // Build the text portion
  const evidenceLines: string[] = [];

  // Prototype evidence
  if (context.prototypeEvidence.length > 0) {
    evidenceLines.push(`PROTOTYPE EVIDENCE (${context.prototypeEvidence.length} file(s)):`);
    for (const item of context.prototypeEvidence) {
      const status = item.retrieval_status === "retrieved" ? "Retrieved and analyzed" : item.retrieval_status === "not_image" ? "Video (not analyzed)" : "Not retrievable";
      evidenceLines.push(
        `  * ${item.file_name} (${item.file_type}) — ${status}` +
        (item.description ? ` — Description: ${item.description}` : "") +
        (item.retrieval_error ? ` — Error: ${item.retrieval_error}` : ""),
      );
    }
    evidenceLines.push("");
  } else {
    evidenceLines.push("PROTOTYPE EVIDENCE: Not submitted.");
    evidenceLines.push("");
  }

  // GitHub
  if (context.githubContent) {
    evidenceLines.push(`GITHUB REPOSITORY: ${context.githubContent.repo_url}`);
    evidenceLines.push(`  Retrieval status: ${context.githubContent.retrieval_status}`);
    if (context.githubContent.readme_content) {
      evidenceLines.push(`  README (excerpt):`);
      evidenceLines.push(`    ${context.githubContent.readme_content.slice(0, 3000)}`);
    }
    if (context.githubContent.readme_error) {
      evidenceLines.push(`  README error: ${context.githubContent.readme_error}`);
    }
    if (context.githubContent.file_tree) {
      evidenceLines.push(`  File tree (first 100 entries):`);
      evidenceLines.push(`    ${context.githubContent.file_tree.slice(0, 100).join("\n    ")}`);
    }
    if (context.githubContent.tree_error) {
      evidenceLines.push(`  Tree error: ${context.githubContent.tree_error}`);
    }
    if (context.githubContent.error) {
      evidenceLines.push(`  Error: ${context.githubContent.error}`);
    }
    evidenceLines.push("");
  } else {
    evidenceLines.push("GITHUB REPOSITORY: Not submitted.");
    evidenceLines.push("");
  }

  // Website
  if (context.websiteContent) {
    evidenceLines.push(`LIVE WEBSITE: ${context.websiteContent.url}`);
    evidenceLines.push(`  Retrieval status: ${context.websiteContent.retrieval_status}`);
    if (context.websiteContent.title) {
      evidenceLines.push(`  Page title: ${context.websiteContent.title}`);
    }
    if (context.websiteContent.description) {
      evidenceLines.push(`  Meta description: ${context.websiteContent.description}`);
    }
    if (context.websiteContent.html_text) {
      evidenceLines.push(`  Visible text (excerpt):`);
      evidenceLines.push(`    ${context.websiteContent.html_text.slice(0, 3000)}`);
    }
    if (context.websiteContent.links && context.websiteContent.links.length > 0) {
      evidenceLines.push(`  Navigation links found: ${context.websiteContent.links.length}`);
    }
    if (context.websiteContent.error) {
      evidenceLines.push(`  Error: ${context.websiteContent.error}`);
    }
    evidenceLines.push("");
  } else {
    evidenceLines.push("LIVE WEBSITE: Not submitted.");
    evidenceLines.push("");
  }

  const textContent = `Please evaluate the following project based on the submitted evidence.

PROJECT DETAILS:
- Name: ${context.projectName}
- Domain: ${context.domain || "Not specified"}
- Problem Statement: ${context.problemStatement || "Not specified"}
- Learning Objective: ${context.learningObjective || "Not specified"}
- Research Notes: ${context.hasResearchNotes ? "Saved" : "Not saved"}

SUBMITTED EVIDENCE:
${evidenceLines.join("\n")}

Evaluate this project honestly based on what can be observed from the evidence. For prototype images, evaluate visual design, visible functionality, UX, navigation, and consistency. For GitHub repositories, inspect structure, README, technology stack, code organization, and architecture indicators where accessible. For live websites, evaluate visual design, navigation, usability, and visible content from the fetched HTML. If any evidence source is inaccessible or insufficient, state that limitation clearly.

Do not claim code execution or successful tests unless the evidence genuinely demonstrates it. Do not treat missing evidence as project failure.`;

  parts.push({ type: "text", text: textContent });

  // Add image parts for vision-capable evaluation
  const retrievedImages = context.prototypeEvidence.filter(
    (e) => e.retrieval_status === "retrieved" && e.data_uri,
  );
  for (const img of retrievedImages) {
    parts.push({
      type: "image_url",
      image_url: { url: img.data_uri! },
    });
  }

  return parts;
}

export function buildFallbackReport(context: EvaluationContext): EvaluationReport {
  const hasAnyEvidence =
    context.prototypeEvidence.length > 0 ||
    Boolean(context.githubContent?.repo_url) ||
    Boolean(context.websiteContent?.url);

  const evidenceList: string[] = [];
  if (context.githubContent?.repo_url) {
    evidenceList.push(`GitHub: ${context.githubContent.repo_url}`);
  }
  if (context.websiteContent?.url) {
    evidenceList.push(`Website: ${context.websiteContent.url}`);
  }
  for (const e of context.prototypeEvidence) {
    evidenceList.push(`${e.file_name} (${e.file_type})`);
  }

  return {
    project_overview: {
      project_name: context.projectName,
      submitted_evidence: evidenceList,
      available_technologies: [],
      project_context: context.problemStatement || "No problem statement provided.",
    },
    strengths: [],
    weaknesses: [
      {
        observation: "No AI provider is configured for automated evaluation.",
        why_it_matters: "Without AI integration, STRIDE cannot generate an automated evaluation report. Configure AI_PROVIDER, AI_BASE_URL, AI_API_KEY, and AI_MODEL to enable this feature.",
      },
    ],
    missing_features: ["AI evaluation service not configured"],
    technical_assessment: {
      architecture: "Not assessed - AI evaluation service not configured.",
      code_quality: "Not assessed - AI evaluation service not configured.",
      usability: "Not assessed - AI evaluation service not configured.",
      functionality: "Not assessed - AI evaluation service not configured.",
      other: "Configure an AI provider to enable technical assessment.",
    },
    issues_and_severity: [
      {
        issue: "AI provider not configured",
        severity: "high",
      },
    ],
    completeness_assessment: "not_verifiable",
    recommended_improvements: [
      "Configure an AI provider (AI_PROVIDER, AI_BASE_URL, AI_API_KEY, AI_MODEL) to enable automated project evaluation.",
      "Submit evidence (screenshots, videos, GitHub URL, or website URL) for evaluation.",
    ],
    overall_evaluation: hasAnyEvidence
      ? "Evidence has been submitted but cannot be evaluated automatically because no AI provider is configured. Configure AI integration to receive a structured evaluation report."
      : "No evidence has been submitted. Upload prototype evidence, a GitHub repository URL, or a live website URL before requesting an evaluation.",
  };
}

export async function generateEvaluation(
  context: EvaluationContext,
): Promise<EvaluationReport> {
  try {
    const systemPrompt = buildEvaluationSystemPrompt();
    const userContent = buildEvaluationUserPrompt(context);
    const aiResponse = await callAIProvider(systemPrompt, userContent);

    // Parse the JSON response
    const cleaned = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as EvaluationReport;
    return parsed;
  } catch (error) {
    // If AI is not available or returns invalid JSON, return a fallback report
    // that honestly explains the limitation
    const fallback = buildFallbackReport(context);
    const errorMessage = error instanceof Error ? error.message : String(error);

    fallback.overall_evaluation = `Evaluation could not be completed: ${errorMessage}. ` +
      fallback.overall_evaluation;

    return fallback;
  }
}

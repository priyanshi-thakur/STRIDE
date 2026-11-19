/**
 * STRIDE Evidence Retrieval Service
 *
 * Retrieves actual evidence content server-side for AI-powered evaluation.
 * All external HTTP requests and Supabase Storage access happen server-side.
 * No secrets or credentials are exposed to the browser.
 *
 * Supported evidence sources:
 *   - Prototype images/videos from Supabase Storage (private bucket)
 *   * GitHub public repositories (README, file tree via GitHub API)
 *   * Live websites (server-side HTML fetch with SSRF protection)
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// SSRF protection for website fetching
// ---------------------------------------------------------------------------

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

const PRIVATE_IP_PREFIXES = [
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "169.254.", // link-local
];

const MAX_RESPONSE_BYTES = 500_000; // 500 KB for website HTML
const MAX_IMAGE_BYTES = 10_000_000; // 10 MB for prototype images
const FETCH_TIMEOUT_MS = 15_000; // 15 seconds

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower)) return true;
  for (const prefix of PRIVATE_IP_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  return false;
}

function validateUrl(urlString: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { ok: false, reason: "Invalid URL format." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https URLs are supported." };
  }

  if (isBlockedHost(url.hostname)) {
    return {
      ok: false,
      reason: "Access to this host is not permitted for security reasons.",
    };
  }

  return { ok: true, url };
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Disable automatic redirect following to prevent SSRF via redirect.
    // We manually validate the final URL after the response arrives.
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      redirect: "manual",
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Prototype evidence retrieval (images from Supabase Storage)
// ---------------------------------------------------------------------------

interface PrototypeEvidenceItem {
  file_name: string;
  file_type: string;
  description: string | null;
  storage_path: string;
  signed_url: string | null;
  size_bytes?: number;
}

interface RetrievedImageEvidence {
  file_name: string;
  file_type: string;
  description: string | null;
  data_uri: string | null; // base64 data URI for vision-capable models
  retrieval_status: "retrieved" | "not_retrievable" | "not_image";
  retrieval_error?: string;
}

async function retrievePrototypeEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: PrototypeEvidenceItem[],
): Promise<RetrievedImageEvidence[]> {
  const results: RetrievedImageEvidence[] = [];

  for (const item of items) {
    const isImage = item.file_type.startsWith("image/");

    if (!isImage) {
      results.push({
        file_name: item.file_name,
        file_type: item.file_type,
        description: item.description,
        data_uri: null,
        retrieval_status: "not_image",
      });
      continue;
    }

    if (!item.storage_path) {
      results.push({
        file_name: item.file_name,
        file_type: item.file_type,
        description: item.description,
        data_uri: null,
        retrieval_status: "not_retrievable",
        retrieval_error: "No storage path available.",
      });
      continue;
    }

    // Use the signed URL if available, otherwise generate one
    let downloadUrl = item.signed_url;

    if (!downloadUrl) {
      try {
        const { data } = await supabase.storage
          .from("prototype-evidence")
          .createSignedUrl(item.storage_path, 300);
        downloadUrl = data?.signedUrl ?? null;
      } catch {
        // Signed URL generation failed; fall through to error
      }
    }

    if (!downloadUrl) {
      results.push({
        file_name: item.file_name,
        file_type: item.file_type,
        description: item.description,
        data_uri: null,
        retrieval_status: "not_retrievable",
        retrieval_error: "Unable to generate signed download URL.",
      });
      continue;
    }

    // Fetch the image bytes server-side and convert to base64 data URI
    try {
      const response = await fetchWithTimeout(downloadUrl, {}, FETCH_TIMEOUT_MS);

      if (!response.ok) {
        results.push({
          file_name: item.file_name,
          file_type: item.file_type,
          description: item.description,
          data_uri: null,
          retrieval_status: "not_retrievable",
          retrieval_error: `Storage returned status ${response.status}.`,
        });
        continue;
      }

      const contentType = response.headers.get("content-type");

      // Validate that the actual response is an image. Do not fall back to
      // the client-supplied file_type, which is untrusted.
      if (
        !contentType ||
        !(
          contentType.startsWith("image/") ||
          contentType === "application/octet-stream"
        )
      ) {
        results.push({
          file_name: item.file_name,
          file_type: item.file_type,
          description: item.description,
          data_uri: null,
          retrieval_status: "not_retrievable",
          retrieval_error: `Unexpected content type: ${contentType ?? "none"}. Expected an image.`,
        });
        continue;
      }

      // Read response body with size limit
      const reader = response.body?.getReader();
      if (!reader) {
        results.push({
          file_name: item.file_name,
          file_type: item.file_type,
          description: item.description,
          data_uri: null,
          retrieval_status: "not_retrievable",
          retrieval_error: "Unable to read response body.",
        });
        continue;
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let sizeExceeded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalBytes += value.length;
        if (totalBytes > MAX_IMAGE_BYTES) {
          sizeExceeded = true;
          break;
        }
      }

      // Cancel the reader to release the underlying connection resources.
      try {
        await reader.cancel();
      } catch {
        // Cancel may fail if the stream is already closed; ignore.
      }

      // If we broke out due to size limit, skip this image
      if (sizeExceeded || totalBytes > MAX_IMAGE_BYTES) {
        results.push({
          file_name: item.file_name,
          file_type: item.file_type,
          description: item.description,
          data_uri: null,
          retrieval_status: "not_retrievable",
          retrieval_error: `Image exceeds ${MAX_IMAGE_BYTES / 1_000_000} MB size limit.`,
        });
        continue;
      }

      const arrayBuffer = Buffer.concat(chunks);
      const base64 = arrayBuffer.toString("base64");
      const dataUri = `data:${contentType};base64,${base64}`;

      results.push({
        file_name: item.file_name,
        file_type: item.file_type,
        description: item.description,
        data_uri: dataUri,
        retrieval_status: "retrieved",
      });
    } catch (error) {
      results.push({
        file_name: item.file_name,
        file_type: item.file_type,
        description: item.description,
        data_uri: null,
        retrieval_status: "not_retrievable",
        retrieval_error:
          error instanceof Error ? error.message : "Unknown retrieval error.",
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// GitHub repository retrieval
// ---------------------------------------------------------------------------

interface RetrievedGitHubContent {
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

async function retrieveGitHubRepository(
  githubUrl: string,
): Promise<RetrievedGitHubContent> {
  // Parse owner/repo from https://github.com/owner/repo
  const match = githubUrl.match(/^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/?$/);
  if (!match) {
    return {
      repo_url: githubUrl,
      owner: "",
      repo: "",
      retrieval_status: "inaccessible",
      error: "Invalid GitHub repository URL format.",
    };
  }

  const [, owner, repo] = match;
  const baseApi = "https://api.github.com";

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "STRIDE-Evaluation/1.0",
  };

  // Optional: add GitHub token if available (increases rate limits)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const result: RetrievedGitHubContent = {
    repo_url: githubUrl,
    owner,
    repo,
    retrieval_status: "retrieved",
  };

  // Fetch README
  try {
    const readmeResponse = await fetchWithTimeout(
      `${baseApi}/repos/${owner}/${repo}/readme`,
      { headers },
      FETCH_TIMEOUT_MS,
    );

    if (readmeResponse.ok) {
      const readmeData = await readmeResponse.json();
      if (readmeData.content) {
        // GitHub returns base64-encoded content
        try {
          result.readme_content = Buffer.from(readmeData.content, "base64").toString(
            "utf-8",
          );
        } catch {
          result.readme_content = "[README content could not be decoded]";
        }
      }
    } else if (readmeResponse.status === 404) {
      result.readme_error = "README not found.";
    } else {
      result.readme_error = `README fetch returned status ${readmeResponse.status}.`;
    }
  } catch (error) {
    result.readme_error = error instanceof Error ? error.message : "Unknown error.";
  }

  // Fetch file tree
  try {
    const treeResponse = await fetchWithTimeout(
      `${baseApi}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers },
      FETCH_TIMEOUT_MS,
    );

    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      if (treeData.tree && Array.isArray(treeData.tree)) {
        result.file_tree = treeData.tree
          .map((node: { path: string; type: string }) => node.path)
          .slice(0, 200); // Limit to first 200 entries
      }
    } else if (treeResponse.status === 404) {
      result.tree_error = "Repository tree not found.";
    } else {
      result.tree_error = `Tree fetch returned status ${treeResponse.status}.`;
    }
  } catch (error) {
    result.tree_error = error instanceof Error ? error.message : "Unknown error.";
  }

  // If both readme and tree failed, mark as inaccessible
  if (
    result.readme_error &&
    result.tree_error &&
    !result.readme_content &&
    !result.file_tree
  ) {
    result.retrieval_status = "inaccessible";
    result.error =
      "Repository could not be accessed. It may be private, rate-limited, or not exist.";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Live website retrieval with SSRF protection
// ---------------------------------------------------------------------------

interface RetrievedWebsiteContent {
  url: string;
  retrieval_status: "retrieved" | "not_retrievable" | "blocked" | "inaccessible";
  html_text?: string;
  title?: string;
  description?: string;
  links?: string[];
  error?: string;
}

async function retrieveWebsiteContent(
  websiteUrl: string,
): Promise<RetrievedWebsiteContent> {
  const validation = validateUrl(websiteUrl);
  if (!validation.ok) {
    return {
      url: websiteUrl,
      retrieval_status: "blocked",
      error: validation.reason,
    };
  }

  const { url } = validation;

  try {
    const response = await fetchWithTimeout(url.toString(), {}, FETCH_TIMEOUT_MS);

    // Reject all redirect responses (3xx). With redirect: "manual", fetch()
    // does not follow redirects and returns the 3xx response itself. The
    // redirect destination is in the Location header, which we must NOT
    // follow — doing so could lead to SSRF against private/internal hosts.
    if (response.status >= 300 && response.status < 400) {
      return {
        url: url.toString(),
        retrieval_status: "blocked",
        error: "HTTP redirects are not permitted for security reasons.",
      };
    }

    if (!response.ok) {
      return {
        url: url.toString(),
        retrieval_status: "inaccessible",
        error: `Website returned status ${response.status}.`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return {
        url: url.toString(),
        retrieval_status: "inaccessible",
        error: `URL does not serve HTML (content-type: ${contentType}).`,
      };
    }

    // Read response body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      return {
        url: url.toString(),
        retrieval_status: "inaccessible",
        error: "Unable to read response body.",
      };
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.length;
      if (totalBytes > MAX_RESPONSE_BYTES) break;
    }

    const html = Buffer.concat(chunks).toString("utf-8", 0, totalBytes);

    // Extract basic info using simple regex (no DOM parser dependency)
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
    );

    // Extract internal links (href attributes)
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']*)["']/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) && links.length < 50) {
      links.push(linkMatch[1]);
    }

    // Extract visible text very crudely (strip tags)
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    return {
      url: url.toString(),
      retrieval_status: "retrieved",
      html_text: textContent,
      title: titleMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim(),
      links,
    };
  } catch (error) {
    return {
      url: url.toString(),
      retrieval_status: "inaccessible",
      error: error instanceof Error ? error.message : "Unknown retrieval error.",
    };
  }
}

export {
  retrievePrototypeEvidence,
  retrieveGitHubRepository,
  retrieveWebsiteContent,
};
export type {
  RetrievedImageEvidence,
  RetrievedGitHubContent,
  RetrievedWebsiteContent,
};

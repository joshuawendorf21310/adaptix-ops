// ============================================================
// Adaptix Ops — GitHub Models Runner
// ============================================================
// Calls GitHub Models (or configured model endpoint) with
// structured prompt templates. On any failure, returns UNKNOWN.
// Never blocks deterministic monitoring.
// Never converts model output into PASS.
// ============================================================

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { ModelStatus } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROMPTS_DIR = join(__dirname, "..", "..", "prompts");

// GitHub Models endpoint
const GITHUB_MODELS_ENDPOINT =
  process.env.GITHUB_MODELS_ENDPOINT ??
  "https://models.inference.ai.azure.com";

// Token: prefer GITHUB_MODELS_TOKEN, fall back to GITHUB_TOKEN
function getModelToken(): string | null {
  return (
    process.env.GITHUB_MODELS_TOKEN ??
    process.env.GITHUB_TOKEN ??
    null
  );
}

export interface ModelUnavailableResult {
  status: "UNKNOWN";
  reason: "model_unavailable" | "prompt_not_found" | "schema_validation_failed" | "parse_error";
  detail?: string;
}

export type ModelResult<T> = T | ModelUnavailableResult;

export function isModelUnavailable(
  result: ModelResult<unknown>
): result is ModelUnavailableResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "status" in result &&
    (result as ModelUnavailableResult).status === "UNKNOWN"
  );
}

// ── Prompt Loading ────────────────────────────────────────────

interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ParsedPrompt {
  name: string;
  model: string;
  messages: PromptMessage[];
}

function loadPrompt(promptFileName: string): ParsedPrompt | null {
  const promptPath = join(PROMPTS_DIR, promptFileName);
  if (!existsSync(promptPath)) {
    console.warn(`[models] Prompt file not found: ${promptPath}`);
    return null;
  }
  try {
    const raw = readFileSync(promptPath, "utf-8");
    return parsePromptYml(raw);
  } catch (err) {
    console.warn(`[models] Failed to parse prompt ${promptFileName}:`, err);
    return null;
  }
}

function parsePromptYml(raw: string): ParsedPrompt {
  // Simple YAML parser for our specific prompt format
  // Extracts name, model, and messages array
  const lines = raw.split("\n");
  let name = "";
  let model = "openai/gpt-4o";
  const messages: PromptMessage[] = [];

  let inMessages = false;
  let currentRole: string | null = null;
  let currentContentLines: string[] = [];
  let inContent = false;

  for (const line of lines) {
    if (line.startsWith("name:")) {
      name = line.replace("name:", "").trim();
    } else if (line.startsWith("model:")) {
      model = line.replace("model:", "").trim();
    } else if (line.trim() === "messages:") {
      inMessages = true;
    } else if (inMessages) {
      const roleMatch = line.match(/^\s+-\s+role:\s+(\w+)/);
      if (roleMatch) {
        if (currentRole && currentContentLines.length > 0) {
          messages.push({
            role: currentRole as PromptMessage["role"],
            content: currentContentLines.join("\n").trim(),
          });
        }
        currentRole = roleMatch[1] ?? null;
        currentContentLines = [];
        inContent = false;
      } else if (line.match(/^\s+content:\s*\|/)) {
        inContent = true;
      } else if (inContent && line.match(/^\s{6,}/)) {
        currentContentLines.push(line.replace(/^\s{6}/, ""));
      } else if (inContent && line.match(/^\s{4}[^\s]/)) {
        inContent = false;
      }
    }
  }

  if (currentRole && currentContentLines.length > 0) {
    messages.push({
      role: currentRole as PromptMessage["role"],
      content: currentContentLines.join("\n").trim(),
    });
  }

  return { name, model, messages };
}

function interpolateTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const token = `{{${key}}}`;
    const replacement =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    result = result.replaceAll(token, replacement);
  }
  return result;
}

// ── Model API Call ────────────────────────────────────────────

async function callModelApi(
  model: string,
  messages: PromptMessage[]
): Promise<string> {
  const token = getModelToken();
  if (!token) {
    throw new Error("No model token available (GITHUB_MODELS_TOKEN or GITHUB_TOKEN)");
  }

  const response = await fetch(`${GITHUB_MODELS_ENDPOINT}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Model API returned ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model API returned empty content");
  }
  return content;
}

// ── Public API ────────────────────────────────────────────────

export async function runPrompt<T>(
  promptFileName: string,
  variables: Record<string, unknown>
): Promise<ModelResult<T>> {
  const prompt = loadPrompt(promptFileName);
  if (!prompt) {
    return {
      status: "UNKNOWN",
      reason: "prompt_not_found",
      detail: `Prompt file not found: ${promptFileName}`,
    };
  }

  // Interpolate variables into all message content
  const interpolatedMessages = prompt.messages.map((msg) => ({
    ...msg,
    content: interpolateTemplate(msg.content, variables),
  }));

  try {
    const rawOutput = await callModelApi(prompt.model, interpolatedMessages);

    let parsed: T;
    try {
      parsed = JSON.parse(rawOutput) as T;
    } catch {
      return {
        status: "UNKNOWN",
        reason: "parse_error",
        detail: `Failed to parse model JSON output: ${rawOutput.slice(0, 200)}`,
      };
    }

    return parsed;
  } catch (err: unknown) {
    const e = err as Error;
    console.warn(`[models] Model call failed for ${promptFileName}:`, e.message);
    return {
      status: "UNKNOWN",
      reason: "model_unavailable",
      detail: e.message,
    };
  }
}

export function getModelStatus(results: Array<ModelResult<unknown>>): ModelStatus {
  if (results.length === 0) return "UNKNOWN";
  const allUnknown = results.every(isModelUnavailable);
  if (allUnknown) return "UNKNOWN";
  const anyUnknown = results.some(isModelUnavailable);
  if (anyUnknown) return "WARN";
  return "PASS";
}

// Groq provider. Uses the OpenAI-compatible chat completions endpoint at
// api.groq.com/openai/v1. The model, temperature and max_tokens are kept
// tight (temperature 0, max 300) so the response space is small and JSON-
// shaped.
//
// Verify the model id, JSON-mode support and pricing against Groq's own docs
// before rolling out — the qwen preview may change or be withdrawn. The
// provider is deliberately narrow so a swap to a fallback model is a
// one-liner.

import { env } from "../env";
import { extractJsonObject } from "./parse";

export interface ProviderRequest {
  system: string;
  user: string;
  model?: string;
  tryJsonMode?: boolean;
}
export interface ProviderResponse {
  raw: string;
  parsed: unknown;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

const TIMEOUT_MS = 8000;

export async function callGroq(
  req: ProviderRequest
): Promise<ProviderResponse> {
  const e = env();
  if (!e.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
  const model = req.model ?? e.MODERATION_MODEL;
  const body = {
    model,
    temperature: 0,
    max_tokens: 300,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    ...(req.tryJsonMode !== false ? { response_format: { type: "json_object" } } : {}),
  } as const;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${e.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(t);
  }

  if (res.status === 429) {
    const retry = res.headers.get("retry-after");
    const err = new Error(
      `Groq rate-limited (retry-after ${retry ?? "unknown"})`
    );
    (err as { status?: number }).status = 429;
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(raw);
  return {
    raw,
    parsed,
    usage: {
      prompt_tokens: json.usage?.prompt_tokens ?? 0,
      completion_tokens: json.usage?.completion_tokens ?? 0,
      total_tokens: json.usage?.total_tokens ?? 0,
    },
    model,
  };
}

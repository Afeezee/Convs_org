// Robust JSON extraction for LLM output. Groq/Qwen may emit reasoning inside
// <think>…</think>, wrap the JSON in fences, or add trailing prose. This
// module strips those, finds the first balanced JSON object, and returns it
// (or throws for the caller to repair-retry once, then queue).

export function stripReasoning(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

export function extractJsonObject(raw: string): unknown {
  const cleaned = stripReasoning(raw);
  // Scan for the first balanced { … }.
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const candidate = cleaned.slice(start, i + 1);
        return JSON.parse(candidate);
      }
    }
  }
  throw new Error("No balanced JSON object in output");
}

// One-off probe against Groq to confirm real behaviour for this account:
//   • Does JSON mode work for the moderation model?
//   • Does the model emit reasoning (<think> blocks) that we have to strip?
//   • How many tokens does a real moderation call cost?
//
// Run: `GROQ_API_KEY=... npm run probe:groq`. Results feed the migration
// report and let us tune EST_TOKENS + ceilings.

import { callGroq } from "../server/moderation/provider";
import { SYSTEM_PROMPT, buildUserMessage } from "../server/moderation/prompt";
import { extractJsonObject } from "../server/moderation/parse";
import { normaliseVerdict } from "../server/moderation/decide";

async function main() {
  if (!process.env.GROQ_API_KEY) {
    // eslint-disable-next-line no-console
    console.log("GROQ_API_KEY not set, skipping probe");
    return;
  }

  const sample = "This argument lacks evidence. Cite a peer-reviewed source.";
  const user = buildUserMessage({ kind: "comment", content: sample, stance: "oppose" });

  // Round 1: JSON mode
  // eslint-disable-next-line no-console
  console.log("\n[probe] JSON mode enabled");
  try {
    const r = await callGroq({ system: SYSTEM_PROMPT, user, tryJsonMode: true });
    // eslint-disable-next-line no-console
    console.log(" model:", r.model);
    // eslint-disable-next-line no-console
    console.log(" usage:", r.usage);
    // eslint-disable-next-line no-console
    console.log(" raw:", r.raw.slice(0, 400));
    const hasThink = /<think>/i.test(r.raw);
    // eslint-disable-next-line no-console
    console.log(" contains <think>:", hasThink);
    const parsed = extractJsonObject(r.raw);
    const verdict = normaliseVerdict(parsed);
    // eslint-disable-next-line no-console
    console.log(" verdict:", verdict);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(" ERROR:", err instanceof Error ? err.message : err);
  }

  // Round 2: JSON mode disabled (fallback path)
  // eslint-disable-next-line no-console
  console.log("\n[probe] JSON mode disabled");
  try {
    const r = await callGroq({ system: SYSTEM_PROMPT, user, tryJsonMode: false });
    // eslint-disable-next-line no-console
    console.log(" usage:", r.usage);
    // eslint-disable-next-line no-console
    console.log(" raw:", r.raw.slice(0, 400));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(" ERROR:", err instanceof Error ? err.message : err);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

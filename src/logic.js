// QVAC Fake Product Recall Notice Generator — core logic.
// completion() writes the result from a single user input field.
// The panic meter is a deterministic score from keyword density
// and length — never the model rating its own writing.

import { completion } from "@qvac/sdk";

function looksUnusable(text) {
  if (!text || text.trim().length === 0) return true;
  if (text.length > 500) return true;
  if (text.length < 25) return true;
  if (/recall notice$/i.test(text.trim())) return true;
  if (!/[.!?]$/.test(text.trim()) && text.split(/\s+/).length <= 18) return true;
  const bad = [
    "i cannot", "i can't", "as an ai", "i'm not able", "i do not have", "i don't have",
    "didn't input", "did not input", "not enough information", "please provide more",
    "please try again", "i'd be happy to help", "i'll be happy to help", "could you provide",
    "can you provide", "i need more", "please give me more",
  ];
  const lower = text.toLowerCase();
  return bad.some((phrase) => lower.includes(phrase));
}

const FALLBACK = (v) => `URGENT RECALL: Certain batches of ${v} have been found to cause excessive happiness. Consumers should proceed with caution.`;

export async function generate(modelId, input) {
  const run = completion({
    modelId,
    history: [
      {
        role: "system",
        content: ((v) => `Write one short, absurd fake product recall notice (1-2 full sentences, official regulatory tone) for this harmless item: ${v}. Do not reply with just a title or header. Reply with ONLY the full notice text, no preamble.`)(input),
      },
      { role: "user", content: `Input: ${input}` },
    ],
    stream: true,
    completionOpts: { temperature: 0.9, maxTokens: 150 },
  });

  let text = "";
  for await (const token of run.tokenStream) text += token;
  text = text
    .trim()
    .replace(/^.*?\b(?:here'?s|here is)\b[^:\n]*:\s*\n*/i, "")
    .trim()
    .replace(/^\([^)]*\)\s*/, "")
    .trim()
    .split("\n")[0]
    .trim()
    .replace(/^\*+|\*+$/g, "")
    .trim()
    .replace(/^["']/, "")
    .replace(/["']$/, "")
    .replace(/:\s*$/, "")
    .trim();

  const result = looksUnusable(text) ? FALLBACK(input) : text;
  return { result, panic: scorePanic(result) };
}

const KEYWORDS = ["recall", "urgent", "immediately", "hazard", "risk", "danger", "affected"];

function scorePanic(text) {
  const lower = text.toLowerCase();
  let score = 45;
  score += KEYWORDS.filter((w) => lower.includes(w)).length * 8;
  score += Math.min(text.split(/\s+/).length, 20);
  return Math.max(1, Math.min(99, Math.round(score)));
}

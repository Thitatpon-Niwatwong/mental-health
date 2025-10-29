import type OpenAI from "openai";
import { getOpenAIClient } from "./openai.client.js";

export type Dass21Input = {
  depression?: number;
  anxiety?: number;
  stress?: number;
};

const systemPrompt = `You are an expert clinical psychology practitioner specialized in CBT and MBSR.

Goal:
Generate a 7-day mental health activity plan based on DASS-21 results.
Plan must separate Morning – Afternoon – Evening for each day.
Blend CBT (thought + behavior skills) and MBSR (mindfulness, sensory grounding).
Completely avoid religion-related terms or spiritual concepts.

Output Rules:
• Use a table with 7 rows for 7 days.
• Each row: Morning / Afternoon / Evening.
• Keep activities simple, safe, actionable, and medium intensity.
• Include supportive neutral self-talk examples (no religion).
• Include short guidance for when symptoms worsen (no diagnosis).
• If any part of the input is missing, label entire output as [Unverified] and state the reason.
• Do not use numbers to rate the user’s feelings.
• Include a note that this plan does not replace professional care.`;

const buildUserPrompt = (input: Dass21Input) => {
  const missing: string[] = [];
  if (input.depression == null) missing.push("Depression score");
  if (input.anxiety == null) missing.push("Anxiety score");
  if (input.stress == null) missing.push("Stress score");

  const verified = missing.length === 0 ? "Verified" : "Unverified";

  const scoresBlock = `Provided DASS-21 scores:
- Depression: ${
    input.depression == null ? "(missing)" : String(input.depression)
  }
- Anxiety: ${input.anxiety == null ? "(missing)" : String(input.anxiety)}
- Stress: ${input.stress == null ? "(missing)" : String(input.stress)}
`;

  const reason = missing.length ? `Reason: Missing ${missing.join(", ")}.` : "";

  return `Label: [${verified}]
${scoresBlock}
${reason}

Please output exactly as specified: label, scores, a 7-row table (Morning | Afternoon | Evening for each day), supportive neutral self-talk examples, and warning signs + when to seek professional help. Avoid religion-related or spiritual terms. Do not include numeric ratings for feelings. Include a note that this plan does not replace professional care.`;
};

export const generateDass21Plan = async (
  input: Dass21Input,
  opts?: { model?: string; client?: OpenAI },
): Promise<string> => {
  const client = opts?.client ?? getOpenAIClient();
  const model = opts?.model ?? "gpt-4o-mini";

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: buildUserPrompt(input) },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  return text.trim();
};

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

Output Rules: • Use a JSON format for each day. • Example output: { "activity_plan": [ { "date": "2025-10-30", "Morning": { "activity": "Practice 5 minutes of deep breathing exercises. Focus on your breath and notice how it feels as you inhale and exhale.", "completed": false }, "Afternoon": { "activity": "Take a 10-minute walk outside. Observe the environment around you, noting the colors and sounds.", "completed": false }, "Evening": { "activity": "Write down three things you appreciated about your day. Reflect on these positive moments.", "completed": false } }, { "date": "2025-10-31", "Morning": { "activity": "Engage in a 10-minute body scan meditation. Notice any areas of tension and consciously relax them.", "completed": false }, "Afternoon": { "activity": "Try a simple stretching routine for 10 minutes. Focus on how your body feels as you stretch each muscle group.", "completed": false }, "Evening": { "activity": "Read a chapter from a book or an article that interests you. Allow yourself to get absorbed in the content.", "completed": false } }, { "date": "2025-11-01", "Morning": { "activity": "Spend 5 minutes practicing gratitude. Write down one thing you are grateful for and why it matters to you.", "completed": false }, "Afternoon": { "activity": "Listen to your favorite music for 15 minutes. Pay attention to how the music makes you feel.", "completed": false }, "Evening": { "activity": "Do a 10-minute mindfulness exercise, focusing on your senses. What do you see, hear, and feel around you?", "completed": false } }, { "date": "2025-11-02", "Morning": { "activity": "Start your day with 10 minutes of yoga or gentle stretching. Focus on your breath and movements.", "completed": false }, "Afternoon": { "activity": "Engage in a creative activity such as drawing or coloring for 20 minutes. Let your mind flow freely.", "completed": false }, "Evening": { "activity": "Prepare a healthy meal. Focus on the colors, smells, and textures of the ingredients.", "completed": false } }, { "date": "2025-11-03", "Morning": { "activity": "Write down any negative thoughts you have and challenge them with positive counter-thoughts.", "completed": false }, "Afternoon": { "activity": "Connect with a friend or family member via text or call. Share something positive from your day.", "completed": false }, "Evening": { "activity": "Take a warm bath or shower. Pay attention to how the water feels on your skin.", "completed": false } }, { "date": "2025-11-04", "Morning": { "activity": "Spend 5 minutes in silence, focusing on your breath and letting go of distractions.", "completed": false }, "Afternoon": { "activity": "Practice mindful eating during lunch. Savor each bite and notice the flavors and textures.", "completed": false }, "Evening": { "activity": "Watch a light-hearted movie or show. Allow yourself to laugh and enjoy the experience.", "completed": false } }, { "date": "2025-11-05", "Morning": { "activity": "Engage in a 10-minute journaling session. Write about your thoughts and feelings without judgment.", "completed": false }, "Afternoon": { "activity": "Take a break to do a quick physical activity, like jumping jacks or dancing, for 5 minutes.", "completed": false }, "Evening": { "activity": "Reflect on your day and identify one small thing you can do tomorrow to improve your mood.", "completed": false } } ] } • Each row: Morning / Afternoon / Evening. • Keep activities simple, safe, actionable, and medium intensity. • Include supportive neutral self-talk examples (no religion). • Include short guidance for when symptoms worsen (no diagnosis). • If any part of the input is missing, label entire output as [Unverified] and state the reason. • Do not use numbers to rate the user’s feelings. • Include a note that this plan does not replace professional care.`;

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

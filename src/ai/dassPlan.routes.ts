import { Router } from "express";
import { z } from "zod";
import { generateDass21Plan } from "./dassPlan.service.js";
import type { RequestHandler } from "express";
import { createDassScore } from "./dassScore.repository.js";
import { signInWithName } from "../users/user.service.js";

const router = Router();

type DassItem = {
  id: number;
  text: string;
  subscale: "Stress" | "Anxiety" | "Depression";
};

const DASS21_ITEMS_EN: DassItem[] = [
  { id: 1, text: "I found it hard to wind down.", subscale: "Stress" },
  { id: 2, text: "I was aware of dryness of my mouth.", subscale: "Anxiety" },
  {
    id: 3,
    text: "I couldn't seem to experience any positive feeling at all.",
    subscale: "Depression",
  },
  {
    id: 4,
    text: "I experienced breathing difficulty (e.g., excessively rapid breathing, breathlessness in the absence of physical exertion).",
    subscale: "Anxiety",
  },
  {
    id: 5,
    text: "I found it difficult to work up the initiative to do things.",
    subscale: "Depression",
  },
  { id: 6, text: "I tended to over-react to situations.", subscale: "Stress" },
  {
    id: 7,
    text: "I experienced trembling (e.g., in the hands).",
    subscale: "Anxiety",
  },
  {
    id: 8,
    text: "I felt that I was using a lot of nervous energy.",
    subscale: "Stress",
  },
  {
    id: 9,
    text: "I was worried about situations in which I might panic and make a fool of myself.",
    subscale: "Anxiety",
  },
  {
    id: 10,
    text: "I felt that I had nothing to look forward to.",
    subscale: "Depression",
  },
  { id: 11, text: "I found myself getting agitated.", subscale: "Stress" },
  { id: 12, text: "I found it difficult to relax.", subscale: "Stress" },
  { id: 13, text: "I felt down-hearted and blue.", subscale: "Depression" },
  {
    id: 14,
    text: "I was intolerant of anything that kept me from getting on with what I was doing.",
    subscale: "Stress",
  },
  { id: 15, text: "I felt I was close to panic.", subscale: "Anxiety" },
  {
    id: 16,
    text: "I was unable to become enthusiastic about anything.",
    subscale: "Depression",
  },
  {
    id: 17,
    text: "I felt I wasn't worth much as a person.",
    subscale: "Depression",
  },
  { id: 18, text: "I felt that I was rather touchy.", subscale: "Stress" },
  {
    id: 19,
    text: "I was aware of the action of my heart in the absence of physical exertion (e.g., sense of heart rate increase, heart missing a beat).",
    subscale: "Anxiety",
  },
  {
    id: 20,
    text: "I felt scared without any good reason.",
    subscale: "Anxiety",
  },
  { id: 21, text: "I felt that life was meaningless.", subscale: "Depression" },
];

const DASS21_ITEMS_TH: DassItem[] = [
  { id: 1, text: "ฉันรู้สึกยากที่จะผ่อนคลายลง", subscale: "Stress" },
  { id: 2, text: "ฉันรับรู้ถึงอาการปากแห้ง", subscale: "Anxiety" },
  {
    id: 3,
    text: "ฉันรู้สึกว่าไม่สามารถรู้สึกเชิงบวกได้เลย",
    subscale: "Depression",
  },
  {
    id: 4,
    text: "ฉันมีอาการหายใจลำบาก (เช่น หายใจเร็วหรือหอบ โดยไม่ได้ออกแรง)",
    subscale: "Anxiety",
  },
  {
    id: 5,
    text: "ฉันพบว่ายากที่จะรวบรวมแรงใจลงมือทำสิ่งต่าง ๆ",
    subscale: "Depression",
  },
  { id: 6, text: "ฉันมักตอบสนองเกินเหตุในสถานการณ์ต่าง ๆ", subscale: "Stress" },
  {
    id: 7,
    text: "ฉันรู้สึกว่ามีอาการสั่น (เช่น มือสั่น)",
    subscale: "Anxiety",
  },
  { id: 8, text: "ฉันรู้สึกว่ากำลังใช้พลังงานประสาทมาก", subscale: "Stress" },
  {
    id: 9,
    text: "ฉันกังวลกับสถานการณ์ที่อาจทำให้ตื่นตระหนกและทำให้ตัวเองดูน่าอาย",
    subscale: "Anxiety",
  },
  { id: 10, text: "ฉันรู้สึกว่าไม่มีอะไรให้เฝ้ารอ", subscale: "Depression" },
  {
    id: 11,
    text: "ฉันพบว่าตัวเองเริ่มกระสับกระส่าย/หงุดหงิด",
    subscale: "Stress",
  },
  { id: 12, text: "ฉันพบว่ายากที่จะผ่อนคลาย", subscale: "Stress" },
  { id: 13, text: "ฉันรู้สึกหม่นหมองและเศร้าหมอง", subscale: "Depression" },
  {
    id: 14,
    text: "ฉันไม่อดทนต่อสิ่งใด ๆ ที่ทำให้ฉันทำสิ่งที่กำลังทำอยู่ต่อไปไม่ได้",
    subscale: "Stress",
  },
  { id: 15, text: "ฉันรู้สึกว่าใกล้จะตื่นตระหนก", subscale: "Anxiety" },
  {
    id: 16,
    text: "ฉันไม่สามารถรู้สึกกระตือรือร้นกับสิ่งใด ๆ ได้",
    subscale: "Depression",
  },
  {
    id: 17,
    text: "ฉันรู้สึกว่าตัวเองไม่มีคุณค่าเท่าไร",
    subscale: "Depression",
  },
  {
    id: 18,
    text: "ฉันรู้สึกว่าตนเองค่อนข้างขี้น้อยใจ/ไวต่อความรู้สึก",
    subscale: "Stress",
  },
  {
    id: 19,
    text: "ฉันรับรู้ถึงการเต้นของหัวใจโดยที่ไม่ได้ออกแรง (เช่น รู้สึกหัวใจเต้นเร็ว หรือสะดุด)",
    subscale: "Anxiety",
  },
  { id: 20, text: "ฉันรู้สึกกลัวโดยไม่มีเหตุผลที่ชัดเจน", subscale: "Anxiety" },
  { id: 21, text: "ฉันรู้สึกว่าชีวิตไม่มีความหมาย", subscale: "Depression" },
];

const LangSchema = z.enum(["en", "th"]).default("en");

const getDassItemsHandler: RequestHandler = (req, res, next) => {
  try {
    const raw = (req.query.lang as string | undefined) ?? "en";
    const lang = LangSchema.parse(raw);
    const items = lang === "th" ? DASS21_ITEMS_TH : DASS21_ITEMS_EN;
    res.status(200).json({ items });
  } catch (error) {
    next(error);
  }
};

router.get("/dass-21/items", getDassItemsHandler);

const BodySchema = z.object({
  userName: z.string().trim().min(1).max(100).optional(),
  depression: z.number().int().min(0).max(21).optional(),
  anxiety: z.number().int().min(0).max(21).optional(),
  stress: z.number().int().min(0).max(21).optional(),
});

router.post("/dass-21", async (req, res, next) => {
  try {
    const {
      userName: bodyUserName,
      depression,
      anxiety,
      stress,
    } = BodySchema.parse(req.body ?? {});
    const headerUserName =
      typeof req.headers["x-user-name"] === "string"
        ? (req.headers["x-user-name"] as string)
        : undefined;
    const userName = (bodyUserName ?? headerUserName)?.trim();

    const input: { depression?: number; anxiety?: number; stress?: number } =
      {};
    if (depression != null) input.depression = depression;
    if (anxiety != null) input.anxiety = anxiety;
    if (stress != null) input.stress = stress;

    const planText = await generateDass21Plan(input);

    let plan: unknown = planText;
    const trimmed = planText.trim();
    try {
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        plan = JSON.parse(trimmed);
      }
    } catch {
      plan = planText; // fallback to raw string if JSON.parse fails
    }

    const verified =
      depression != null && anxiety != null && stress != null ? true : false;

    // Persist score if userName is provided
    if (userName && userName.length > 0) {
      try {
        const { user } = await signInWithName(userName);
        const total = (depression ?? 0) + (anxiety ?? 0) + (stress ?? 0);
        const toSave: {
          userId: string;
          userName: string;
          total: number;
          createdAt: string;
          depression?: number;
          anxiety?: number;
          stress?: number;
        } = {
          userId: user.id,
          userName: user.name,
          total,
          createdAt: new Date().toISOString(),
        };
        if (depression != null) toSave.depression = depression;
        if (anxiety != null) toSave.anxiety = anxiety;
        if (stress != null) toSave.stress = stress;
        await createDassScore(toSave);
      } catch (persistError) {
        // Log and continue; do not fail the response due to persistence errors
        console.error("Failed to persist DASS-21 score", persistError);
      }
    }

    res.status(200).json({ plan, verified });
  } catch (error) {
    next(error);
  }
});

export default router;

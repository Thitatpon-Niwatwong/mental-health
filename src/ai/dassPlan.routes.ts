import { Router } from "express";
import { z } from "zod";
import { generateDass21Plan } from "./dassPlan.service.js";

const router = Router();

const BodySchema = z.object({
  depression: z.number().int().min(0).max(21).optional(),
  anxiety: z.number().int().min(0).max(21).optional(),
  stress: z.number().int().min(0).max(21).optional(),
});

router.post("/dass-21", async (req, res, next) => {
  try {
    const { depression, anxiety, stress } = BodySchema.parse(req.body ?? {});

    const input: { depression?: number; anxiety?: number; stress?: number } =
      {};
    if (depression != null) input.depression = depression;
    if (anxiety != null) input.anxiety = anxiety;
    if (stress != null) input.stress = stress;

    const plan = await generateDass21Plan(input);

    const verified =
      depression != null && anxiety != null && stress != null ? true : false;

    res.status(200).json({ plan, verified });
  } catch (error) {
    next(error);
  }
});

export default router;

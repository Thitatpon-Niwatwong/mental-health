import { Router } from "express";
import { z } from "zod";

import { signInWithName } from "./user.service.js";

const router = Router();

const requestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name is required")
    .max(100, "name must be 100 characters or fewer"),
});

router.post("/sessions", async (req, res, next) => {
  try {
    const { name } = requestSchema.parse(req.body);
    const result = await signInWithName(name);

    res.status(result.isNew ? 201 : 200).json({
      user: result.user,
      isNew: result.isNew,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

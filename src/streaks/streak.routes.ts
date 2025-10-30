import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";

import { signInWithName } from "../users/user.service.js";
import { awardDailyFlame, getStreakForUser } from "./streak.service.js";

const router = Router();

const AwardBodySchema = z.object({
  userName: z.string().trim().min(1).max(100).optional(),
  // Optional override: YYYY-MM-DD (UTC). If omitted, server uses today (UTC).
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const resolveUserName = (req: Parameters<RequestHandler>[0]): string | undefined => {
  const bodyUserName = (req.body?.userName as unknown) as string | undefined;
  const headerUserName =
    typeof req.headers["x-user-name"] === "string"
      ? (req.headers["x-user-name"] as string)
      : undefined;
  return (bodyUserName ?? headerUserName)?.trim();
};

router.post("/award", async (req, res, next) => {
  try {
    const { date } = AwardBodySchema.parse(req.body ?? {});
    const userName = resolveUserName(req);
    if (!userName) {
      res.status(400).json({ message: "userName is required (body or x-user-name header)" });
      return;
    }

    const { user } = await signInWithName(userName);
    const opts = date ? { dateKey: date } : undefined;
    const { awarded, currentStreak, lastAwardedDate, record } = await awardDailyFlame(
      user,
      opts,
    );

    res.status(200).json({
      awarded,
      currentStreak,
      lastAwardedDate,
      user: { id: user.id, name: user.name },
      record,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const userName = resolveUserName(req);
    if (!userName) {
      res.status(400).json({ message: "userName is required (x-user-name header)" });
      return;
    }

    const { user } = await signInWithName(userName);
    const record = await getStreakForUser(user);
    res.status(200).json({
      user: { id: user.id, name: user.name },
      streak: record,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

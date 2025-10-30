import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";

import { signInWithName } from "../users/user.service.js";
import { awardDailyFlame, getStreakForUser, repairDailyStreakWithCompletions } from "./streak.service.js";
import { getCompletionStreakForUser } from "./completionStreak.service.js";

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

// Repair a 1-day gap using 5 totalCompletions
router.post("/repair", async (req, res, next) => {
  try {
    const schema = z.object({
      userName: z.string().trim().min(1).max(100).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // the date that is two days after lastAwardedDate
    });
    const { userName: bodyUserName, date } = schema.parse(req.body ?? {});
    const headerUserName =
      typeof req.headers["x-user-name"] === "string"
        ? (req.headers["x-user-name"] as string)
        : undefined;
    const userName = (bodyUserName ?? headerUserName)?.trim();
    if (!userName) {
      res.status(400).json({ message: "userName is required (body or x-user-name header)" });
      return;
    }

    const { user } = await signInWithName(userName);
    const result = await repairDailyStreakWithCompletions(user, { dateKey: date });
    res.status(200).json(result);
  } catch (error) {
    const known = [
      "No eligible streak to repair",
      "Repair allowed only for exactly one missed day gap",
      "Insufficient totalCompletions to spend",
      "No completion streak found for user",
    ];
    if (error instanceof Error && known.some((m) => error.message.includes(m))) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

// New: Get activity streak summary (consecutive days + total tasks)
const getActivityStreakHandler: RequestHandler = async (req, res, next) => {
  try {
    const userName = resolveUserName(req);
    if (!userName) {
      res.status(400).json({ message: "userName is required (x-user-name header)" });
      return;
    }
    const { user } = await signInWithName(userName);
    const [daily, activity] = await Promise.all([
      getStreakForUser(user),
      getCompletionStreakForUser(user),
    ]);
    res.status(200).json({
      user: { id: user.id, name: user.name },
      currentStreak: daily.currentStreak, // consecutive days with at least one completion
      totalCompletions: activity.totalCompletions, // total tasks completed
    });
  } catch (error) {
    next(error);
  }
};

router.get("/activity/me", getActivityStreakHandler);

// Backward-compat: keep old path but return the new shape
router.get("/completions/me", getActivityStreakHandler);

export default router;

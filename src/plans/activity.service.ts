import type { ActivityCompletionRecord, ActivitySlot } from "./activity.types.js";
import {
  findActivityCompletion,
  findCompletionsByDateRange,
  findDayCompletions,
  makeId,
  upsertActivityCompletion,
} from "./activity.repository.js";
import { awardDailyFlame } from "../streaks/streak.service.js";
import { incrementCompletionStreak } from "../streaks/completionStreak.service.js";

const isValidDateKey = (key: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(key);

export type CompleteResult = {
  changed: boolean; // true if we flipped from not-exist/false to true in this call
  completion: ActivityCompletionRecord;
  streak: {
    awarded: boolean;
    currentStreak: number;
    lastAwardedDate: string | null;
  };
  activityStreak?: { totalCompletions: number; currentStreak: number };
};

export const markActivityCompleted = async (
  user: { id: string; name: string },
  date: string,
  slot: ActivitySlot,
): Promise<CompleteResult> => {
  if (!isValidDateKey(date)) throw new Error("Invalid date format; expected YYYY-MM-DD");

  const existing = await findActivityCompletion(user.id, date, slot);
  const nowIso = new Date().toISOString();

  if (existing && existing.completed) {
    const streakRes = await awardDailyFlame(user, { dateKey: date });
    return {
      changed: false,
      completion: existing,
      streak: {
        awarded: streakRes.awarded,
        currentStreak: streakRes.currentStreak,
        lastAwardedDate: streakRes.lastAwardedDate,
      },
    };
  }

  const record: ActivityCompletionRecord = existing
    ? {
        ...existing,
        completed: true,
        completedAt: nowIso,
        updatedAt: nowIso,
        userName: user.name,
      }
    : {
        id: makeId(user.id, date, slot),
        userId: user.id,
        userName: user.name,
        date,
        slot,
        completed: true,
        completedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

  const saved = await upsertActivityCompletion(record);

  // Increment per-activity completion streak only when a new completion occurs
  const activityStreak = await incrementCompletionStreak(user, 1, { dateKey: date });

  const streakRes = await awardDailyFlame(user, { dateKey: date });

  return {
    changed: true,
    completion: saved,
    streak: {
      awarded: streakRes.awarded,
      currentStreak: streakRes.currentStreak,
      lastAwardedDate: streakRes.lastAwardedDate,
    },
    activityStreak: {
      totalCompletions: activityStreak.totalCompletions,
      currentStreak: activityStreak.currentStreak,
    },
  };
};

export const getActivityStatus = async (
  user: { id: string; name: string },
  date: string,
  slot: ActivitySlot,
): Promise<{ completed: boolean; completion: ActivityCompletionRecord | null }> => {
  if (!isValidDateKey(date)) throw new Error("Invalid date format; expected YYYY-MM-DD");
  const rec = await findActivityCompletion(user.id, date, slot);
  return { completed: rec?.completed ?? false, completion: rec ?? null };
};

export const getDayStatus = async (
  user: { id: string; name: string },
  date: string,
): Promise<{
  date: string;
  Morning: boolean;
  Afternoon: boolean;
  Evening: boolean;
  completions: ActivityCompletionRecord[];
}> => {
  if (!isValidDateKey(date)) throw new Error("Invalid date format; expected YYYY-MM-DD");
  const recs = await findDayCompletions(user.id, date);
  const bySlot = new Map(recs.map((r) => [r.slot, r] as const));
  return {
    date,
    Morning: bySlot.get("Morning")?.completed === true,
    Afternoon: bySlot.get("Afternoon")?.completed === true,
    Evening: bySlot.get("Evening")?.completed === true,
    completions: recs,
  };
};

export const hydratePlanWithCompletions = async (
  user: { id: string; name: string },
  plan: unknown,
): Promise<unknown> => {
  // Expect shape: { activity_plan: [{ date, Morning: {completed}, Afternoon: {completed}, Evening: {completed} }, ...] }
  const asAny = plan as any;
  const list: any[] | undefined = asAny?.activity_plan;
  if (!Array.isArray(list) || list.length === 0) return plan;

  const dates = list
    .map((d) => d?.date)
    .filter((s: unknown): s is string => typeof s === "string" && isValidDateKey(s));
  if (dates.length === 0) return plan;

  const start = dates.reduce((a, b) => (a < b ? a : b));
  const end = dates.reduce((a, b) => (a > b ? a : b));
  const recs = await findCompletionsByDateRange(user.id, start, end);

  const key = (date: string, slot: ActivitySlot) => `${date}:${slot}`;
  const completedSet = new Set(
    recs.filter((r) => r.completed).map((r) => key(r.date, r.slot as ActivitySlot)),
  );

  const patched = list.map((row) => {
    if (!row?.date) return row;
    const date: string = row.date;
    const patchSlot = (slot: ActivitySlot) => {
      const slotObj = row?.[slot];
      if (!slotObj || typeof slotObj !== "object") return slotObj;
      const isDone = completedSet.has(key(date, slot));
      return { ...slotObj, completed: isDone };
    };
    return {
      ...row,
      Morning: patchSlot("Morning"),
      Afternoon: patchSlot("Afternoon"),
      Evening: patchSlot("Evening"),
    };
  });

  return { ...asAny, activity_plan: patched };
};

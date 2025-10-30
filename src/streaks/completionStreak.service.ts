import { findCompletionStreakByUserId, upsertCompletionStreak } from "./completionStreak.repository.js";
import type { CompletionStreakRecord } from "./completionStreak.types.js";

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number): Date => {
  const ts = new Date(date);
  ts.setUTCDate(ts.getUTCDate() + days);
  return ts;
};
const dateKeyFromIso = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

export const incrementCompletionStreak = async (
  user: { id: string; name: string },
  amount = 1,
  opts?: { dateKey?: string }, // YYYY-MM-DD for the completion date (UTC)
): Promise<{ totalCompletions: number; currentStreak: number; record: CompletionStreakRecord }> => {
  const existing = await findCompletionStreakByUserId(user.id);
  const nowIso = new Date().toISOString();
  const todayKey = opts?.dateKey ?? toDateKey(new Date());

  if (!existing) {
    const created: CompletionStreakRecord = {
      id: `${user.id}:completion_streak`,
      userId: user.id,
      userName: user.name,
      type: "completion_streak",
      currentStreak: 1,
      totalCompletions: amount,
      lastIncrementAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const saved = await upsertCompletionStreak(created);
    return {
      totalCompletions: saved.totalCompletions,
      currentStreak: saved.currentStreak,
      record: saved,
    };
  }

  const lastDateKey = dateKeyFromIso(existing.lastIncrementAt);
  let nextStreak = existing.currentStreak || 0;
  if (lastDateKey === todayKey) {
    nextStreak = existing.currentStreak; // same day, keep streak
  } else {
    const last = new Date(existing.lastIncrementAt);
    const expectedNextKey = toDateKey(addDays(last, 1));
    nextStreak = expectedNextKey === todayKey ? (existing.currentStreak ?? 0) + 1 : 1;
  }

  const updated: CompletionStreakRecord = {
    ...existing,
    userName: user.name,
    currentStreak: nextStreak,
    totalCompletions: existing.totalCompletions + amount,
    lastIncrementAt: nowIso,
    updatedAt: nowIso,
  };
  const saved = await upsertCompletionStreak(updated);
  return {
    totalCompletions: saved.totalCompletions,
    currentStreak: saved.currentStreak,
    record: saved,
  };
};

export const getCompletionStreakForUser = async (
  user: { id: string; name: string },
): Promise<CompletionStreakRecord> => {
  const existing = await findCompletionStreakByUserId(user.id);
  if (existing) return existing;
  const nowIso = new Date().toISOString();
  return {
    id: `${user.id}:completion_streak`,
    userId: user.id,
    userName: user.name,
    type: "completion_streak",
    currentStreak: 0,
    totalCompletions: 0,
    lastIncrementAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

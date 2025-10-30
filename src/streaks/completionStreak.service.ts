import { findCompletionStreakByUserId, upsertCompletionStreak } from "./completionStreak.repository.js";
import type { CompletionStreakRecord } from "./completionStreak.types.js";

export const incrementCompletionStreak = async (
  user: { id: string; name: string },
  amount = 1,
): Promise<{ totalCompletions: number; record: CompletionStreakRecord }> => {
  const existing = await findCompletionStreakByUserId(user.id);
  const nowIso = new Date().toISOString();

  if (!existing) {
    const created: CompletionStreakRecord = {
      id: `${user.id}:completion_streak`,
      userId: user.id,
      userName: user.name,
      type: "completion_streak",
      totalCompletions: amount,
      lastIncrementAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const saved = await upsertCompletionStreak(created);
    return { totalCompletions: saved.totalCompletions, record: saved };
  }

  const updated: CompletionStreakRecord = {
    ...existing,
    userName: user.name,
    totalCompletions: existing.totalCompletions + amount,
    lastIncrementAt: nowIso,
    updatedAt: nowIso,
  };
  const saved = await upsertCompletionStreak(updated);
  return { totalCompletions: saved.totalCompletions, record: saved };
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
    totalCompletions: 0,
    lastIncrementAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};


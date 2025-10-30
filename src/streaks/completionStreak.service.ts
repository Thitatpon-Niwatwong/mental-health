import { findCompletionStreakByUserId, upsertCompletionStreak } from "./completionStreak.repository.js";
import type { CompletionStreakRecord } from "./completionStreak.types.js";

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);
const isoFromDateKeyUtc = (dateKey: string): string => `${dateKey}T00:00:00.000Z`;

export const incrementCompletionStreak = async (
  user: { id: string; name: string },
  amount = 1,
  opts?: { dateKey?: string }, // YYYY-MM-DD for the completion date (UTC)
): Promise<{ totalCompletions: number; record: CompletionStreakRecord }> => {
  const existing = await findCompletionStreakByUserId(user.id);
  const nowIso = new Date().toISOString();
  const todayKey = opts?.dateKey ?? toDateKey(new Date());
  const eventIso = isoFromDateKeyUtc(todayKey);

  if (!existing) {
    const created: CompletionStreakRecord = {
      id: `${user.id}:completion_streak`,
      userId: user.id,
      userName: user.name,
      type: "completion_streak",
      totalCompletions: amount,
      lastIncrementAt: eventIso,
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
    lastIncrementAt: eventIso,
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

export const spendCompletionCredits = async (
  user: { id: string; name: string },
  amount: number,
): Promise<CompletionStreakRecord> => {
  if (amount <= 0) throw new Error("Amount must be positive");
  const existing = await findCompletionStreakByUserId(user.id);
  if (!existing) throw new Error("No completion streak found for user");
  if (existing.totalCompletions < amount)
    throw new Error("Insufficient totalCompletions to spend");

  const nowIso = new Date().toISOString();
  const updated: CompletionStreakRecord = {
    ...existing,
    userName: user.name,
    totalCompletions: existing.totalCompletions - amount,
    // spending does not change currentStreak or lastIncrementAt
    updatedAt: nowIso,
  };

  return upsertCompletionStreak(updated);
};

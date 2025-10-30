import { findStreakByUserId, upsertStreak } from "./streak.repository.js";
import type { AwardResult, StreakRecord } from "./streak.types.js";

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const parseDateKey = (key: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error("Invalid date key format; expected YYYY-MM-DD");
  const [, yS, mS, dS] = match;
  if (!yS || !mS || !dS) throw new Error("Invalid date key format");
  const y = Number.parseInt(yS, 10);
  const m = Number.parseInt(mS, 10);
  const d = Number.parseInt(dS, 10);
  return new Date(Date.UTC(y, m - 1, d));
};

const addDays = (date: Date, days: number): Date => {
  const ts = new Date(date);
  ts.setUTCDate(ts.getUTCDate() + days);
  return ts;
};

export const awardDailyFlame = async (
  user: { id: string; name: string },
  opts?: { dateKey?: string },
): Promise<AwardResult & { record: StreakRecord }> => {
  const todayKey = opts?.dateKey ?? toDateKey(new Date());

  const existing = await findStreakByUserId(user.id);
  const nowIso = new Date().toISOString();

  if (!existing) {
    const created: StreakRecord = {
      id: user.id,
      userId: user.id,
      userName: user.name,
      currentStreak: 1,
      lastAwardedDate: todayKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const saved = await upsertStreak(created);
    return {
      awarded: true,
      currentStreak: saved.currentStreak,
      lastAwardedDate: saved.lastAwardedDate,
      record: saved,
    };
  }

  // Already have a record
  if (existing.lastAwardedDate === todayKey) {
    // already awarded today
    return {
      awarded: false,
      currentStreak: existing.currentStreak,
      lastAwardedDate: existing.lastAwardedDate,
      record: existing,
    };
  }

  let nextStreak = 1;
  if (existing.lastAwardedDate) {
    const last = parseDateKey(existing.lastAwardedDate);
    const expectedNext = addDays(last, 1);
    const expectedKey = toDateKey(expectedNext);
    nextStreak = expectedKey === todayKey ? existing.currentStreak + 1 : 1;
  }

  const updated: StreakRecord = {
    ...existing,
    currentStreak: nextStreak,
    lastAwardedDate: todayKey,
    updatedAt: nowIso,
    userName: user.name, // keep latest casing/name
  };

  const saved = await upsertStreak(updated);
  return {
    awarded: true,
    currentStreak: saved.currentStreak,
    lastAwardedDate: saved.lastAwardedDate,
    record: saved,
  };
};

export const getStreakForUser = async (
  user: { id: string; name: string },
): Promise<StreakRecord> => {
  const existing = await findStreakByUserId(user.id);
  if (existing) return existing;
  const nowIso = new Date().toISOString();
  return {
    id: user.id,
    userId: user.id,
    userName: user.name,
    currentStreak: 0,
    lastAwardedDate: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

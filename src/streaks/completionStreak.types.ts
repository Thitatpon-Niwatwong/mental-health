export type CompletionStreakRecord = {
  id: string; // `${userId}:completion_streak`
  userId: string;
  userName: string;
  type: "completion_streak";
  currentStreak: number;
  totalCompletions: number;
  lastIncrementAt: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

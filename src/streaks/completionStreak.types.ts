export type CompletionStreakRecord = {
  id: string; // `${userId}:completion_streak`
  userId: string;
  userName: string;
  type: "completion_streak";
  totalCompletions: number;
  lastIncrementAt: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

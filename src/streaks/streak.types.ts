export type StreakRecord = {
  id: string; // use userId as id for 1:1 mapping
  userId: string;
  userName: string;
  currentStreak: number;
  lastAwardedDate: string | null; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
};

export type AwardResult = {
  awarded: boolean; // true if a flame was awarded for the given date
  currentStreak: number;
  lastAwardedDate: string | null;
};


export type ActivitySlot = "Morning" | "Afternoon" | "Evening";

export type ActivityCompletionRecord = {
  id: string; // `${userId}:${date}:${slot}`
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD (UTC)
  slot: ActivitySlot;
  completed: boolean; // always true once created
  completedAt: string; // ISO timestamp
  createdAt: string;
  updatedAt: string;
};


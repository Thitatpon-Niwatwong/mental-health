export type ActivityPlanRecord = {
  id: string;
  userId: string;
  userName: string;
  plan: unknown; // stores the AI plan object/JSON as-is
  verified: boolean;
  createdAt: string; // ISO
};


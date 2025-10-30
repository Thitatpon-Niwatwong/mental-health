import type { Container, SqlQuerySpec } from "@azure/cosmos";
import { randomUUID } from "crypto";
import { z } from "zod";

import { getContainer } from "../database/cosmos.js";
import type { ActivityPlanRecord } from "./plan.types.js";

// Reuse existing container to avoid exceeding account RU cap
// Store plans alongside activity completions, distinguished by a `type` field
const CONTAINER_ID = "activity_completions";
const PARTITION_KEY_PATH = "/userId";

let cachedContainer: Container | null = null;

const getPlansContainer = async (): Promise<Container> => {
  if (cachedContainer) return cachedContainer;
  const container = await getContainer(CONTAINER_ID, {
    partitionKeyPath: PARTITION_KEY_PATH,
  });
  cachedContainer = container;
  return container;
};

// Do not over-validate the nested plan; store as-is to avoid parse failures
const cosmosPlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  plan: z.unknown(),
  verified: z.boolean(),
  createdAt: z.string(),
});

export const createActivityPlan = async (
  input: Omit<ActivityPlanRecord, "id">,
): Promise<ActivityPlanRecord> => {
  const container = await getPlansContainer();
  const doc: ActivityPlanRecord = {
    id: randomUUID(),
    userId: input.userId,
    userName: input.userName,
    plan: input.plan,
    verified: input.verified,
    createdAt: input.createdAt,
  };
  // Persist with a discriminator so queries can isolate plans
  const toCreate = { ...doc, type: "activity_plan" } as const;
  await container.items.create(toCreate);
  cosmosPlanSchema.parse(doc);
  return doc;
};

export const findLatestPlanByUserId = async (
  userId: string,
): Promise<ActivityPlanRecord | null> => {
  const container = await getPlansContainer();
  const query: SqlQuerySpec = {
    query:
      "SELECT TOP 1 * FROM c WHERE c.userId = @userId AND c.type = 'activity_plan' ORDER BY c.createdAt DESC",
    parameters: [{ name: "@userId", value: userId }],
  };
  const { resources } = await container.items
    .query<ActivityPlanRecord>(query)
    .fetchAll();
  const [doc] = resources;
  if (!doc) return null;
  cosmosPlanSchema.parse(doc);
  return doc;
};

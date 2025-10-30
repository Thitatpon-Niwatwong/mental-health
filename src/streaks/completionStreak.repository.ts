import type { Container, SqlQuerySpec } from "@azure/cosmos";
import { z } from "zod";

import { getContainer } from "../database/cosmos.js";
import type { CompletionStreakRecord } from "./completionStreak.types.js";

const STREAKS_CONTAINER_ID = "streaks";
const PARTITION_KEY_PATH = "/userId";

let cachedContainer: Container | null = null;

const cosmosSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  type: z.literal("completion_streak"),
  totalCompletions: z.number().int().nonnegative(),
  lastIncrementAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const getContainerCached = async (): Promise<Container> => {
  if (cachedContainer) return cachedContainer;
  const container = await getContainer(STREAKS_CONTAINER_ID, {
    partitionKeyPath: PARTITION_KEY_PATH,
  });
  cachedContainer = container;
  return container;
};

const normalize = (doc: unknown): CompletionStreakRecord => cosmosSchema.parse(doc);

export const findCompletionStreakByUserId = async (
  userId: string,
): Promise<CompletionStreakRecord | null> => {
  const container = await getContainerCached();
  const query: SqlQuerySpec = {
    query:
      "SELECT TOP 1 * FROM c WHERE c.userId = @userId AND c.type = 'completion_streak'",
    parameters: [{ name: "@userId", value: userId }],
  };
  const { resources } = await container.items
    .query<CompletionStreakRecord>(query)
    .fetchAll();
  const [doc] = resources;
  return doc ? normalize(doc) : null;
};

export const upsertCompletionStreak = async (
  record: CompletionStreakRecord,
): Promise<CompletionStreakRecord> => {
  const container = await getContainerCached();
  const { resource } = await container
    .item(record.id, record.userId)
    .replace(record)
    .catch(async (err) => {
      if (err?.code === 404 || err?.statusCode === 404) {
        const created = await container.items.create(record);
        return created;
      }
      throw err;
    });
  return normalize(resource);
};

import type { Container, SqlQuerySpec } from "@azure/cosmos";
import { z } from "zod";

import { getContainer } from "../database/cosmos.js";
import type { StreakRecord } from "./streak.types.js";

const STREAKS_CONTAINER_ID = "streaks";
const PARTITION_KEY_PATH = "/userId";

let cachedStreaksContainer: Container | null = null;

const cosmosStreakSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  currentStreak: z.number().int().nonnegative(),
  lastAwardedDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const getStreaksContainer = async (): Promise<Container> => {
  if (cachedStreaksContainer) return cachedStreaksContainer;

  const container = await getContainer(STREAKS_CONTAINER_ID, {
    partitionKeyPath: PARTITION_KEY_PATH,
  });

  cachedStreaksContainer = container;
  return container;
};

const normalizeStreak = (streak: unknown): StreakRecord => {
  const parsed = cosmosStreakSchema.parse(streak);
  return parsed;
};

export const findStreakByUserId = async (
  userId: string,
): Promise<StreakRecord | null> => {
  const container = await getStreaksContainer();
  const querySpec: SqlQuerySpec = {
    query:
      "SELECT TOP 1 * FROM c WHERE c.userId = @userId AND (NOT IS_DEFINED(c.type) OR c.type != 'completion_streak')",
    parameters: [{ name: "@userId", value: userId }],
  };

  const { resources } = await container.items
    .query<Record<string, unknown>>(querySpec)
    .fetchAll();

  const [doc] = resources;
  if (!doc) return null;
  return normalizeStreak(doc);
};

export const upsertStreak = async (record: StreakRecord): Promise<StreakRecord> => {
  const container = await getStreaksContainer();
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

  return normalizeStreak(resource);
};

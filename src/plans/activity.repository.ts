import type { Container, SqlQuerySpec } from "@azure/cosmos";
import { z } from "zod";

import { getContainer } from "../database/cosmos.js";
import type { ActivityCompletionRecord } from "./activity.types.js";

const CONTAINER_ID = "activity_completions";
const PARTITION_KEY_PATH = "/userId";

let cachedContainer: Container | null = null;

const cosmosSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  date: z.string(),
  slot: z.enum(["Morning", "Afternoon", "Evening"]),
  completed: z.boolean(),
  completedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const getAcContainer = async (): Promise<Container> => {
  if (cachedContainer) return cachedContainer;
  const container = await getContainer(CONTAINER_ID, {
    partitionKeyPath: PARTITION_KEY_PATH,
  });
  cachedContainer = container;
  return container;
};

const normalize = (doc: unknown): ActivityCompletionRecord => cosmosSchema.parse(doc);

export const makeId = (userId: string, date: string, slot: string): string =>
  `${userId}:${date}:${slot}`;

export const findActivityCompletion = async (
  userId: string,
  date: string,
  slot: "Morning" | "Afternoon" | "Evening",
): Promise<ActivityCompletionRecord | null> => {
  const container = await getAcContainer();
  const id = makeId(userId, date, slot);
  try {
    const { resource } = await container.item(id, userId).read<ActivityCompletionRecord>();
    if (!resource) return null;
    return normalize(resource);
  } catch (err: any) {
    if (err?.code === 404 || err?.statusCode === 404) return null;
    throw err;
  }
};

export const upsertActivityCompletion = async (
  record: ActivityCompletionRecord,
): Promise<ActivityCompletionRecord> => {
  const container = await getAcContainer();
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

export const findDayCompletions = async (
  userId: string,
  date: string,
): Promise<ActivityCompletionRecord[]> => {
  const container = await getAcContainer();
  const query: SqlQuerySpec = {
    query:
      "SELECT * FROM c WHERE c.userId = @userId AND c.date = @date",
    parameters: [
      { name: "@userId", value: userId },
      { name: "@date", value: date },
    ],
  };
  const { resources } = await container.items
    .query<ActivityCompletionRecord>(query)
    .fetchAll();
  return resources.map((r) => normalize(r));
};

export const findCompletionsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ActivityCompletionRecord[]> => {
  const container = await getAcContainer();
  const query: SqlQuerySpec = {
    query:
      "SELECT * FROM c WHERE c.userId = @userId AND c.date >= @start AND c.date <= @end",
    parameters: [
      { name: "@userId", value: userId },
      { name: "@start", value: startDate },
      { name: "@end", value: endDate },
    ],
  };
  const { resources } = await container.items
    .query<ActivityCompletionRecord>(query)
    .fetchAll();
  return resources.map((r) => normalize(r));
};

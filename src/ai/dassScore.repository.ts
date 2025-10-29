import type { Container } from "@azure/cosmos";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getContainer } from "../database/cosmos.js";

export type DassScoreRecord = {
  id: string;
  userId: string;
  userName: string;
  depression?: number;
  anxiety?: number;
  stress?: number;
  total: number;
  createdAt: string; // ISO date-time
};

const CONTAINER_ID = "dass_scores";
const PARTITION_KEY_PATH = "/userId";

let cachedContainer: Container | null = null;

const getScoresContainer = async (): Promise<Container> => {
  if (cachedContainer) return cachedContainer;
  const container = await getContainer(CONTAINER_ID, {
    partitionKeyPath: PARTITION_KEY_PATH,
  });
  cachedContainer = container;
  return container;
};

const cosmosScoreSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  depression: z.number().int().min(0).max(21).optional(),
  anxiety: z.number().int().min(0).max(21).optional(),
  stress: z.number().int().min(0).max(21).optional(),
  total: z.number().int().min(0),
  createdAt: z.string(),
});

export const createDassScore = async (
  record: Omit<DassScoreRecord, "id">,
): Promise<DassScoreRecord> => {
  const container = await getScoresContainer();
  const doc: DassScoreRecord = {
    id: randomUUID(),
    userId: record.userId,
    userName: record.userName,
    total: record.total,
    createdAt: record.createdAt,
    ...(record.depression !== undefined ? { depression: record.depression } : {}),
    ...(record.anxiety !== undefined ? { anxiety: record.anxiety } : {}),
    ...(record.stress !== undefined ? { stress: record.stress } : {}),
  };
  await container.items.create(doc);
  const parsed = cosmosScoreSchema.parse(doc);
  return parsed;
};

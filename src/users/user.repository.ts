import type { Container, SqlQuerySpec } from "@azure/cosmos";
import { randomUUID } from "crypto";
import { z } from "zod";

import { getContainer } from "../database/cosmos.js";
import type { UserRecord } from "./user.types.js";

const USERS_CONTAINER_ID = "users";
const PARTITION_KEY_PATH = "/name";

const cosmosUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

let cachedUsersContainer: Container | null = null;

const isConflictError = (
  error: unknown,
): error is { code?: number; statusCode?: number } => {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: number; statusCode?: number };
  return maybeError.code === 409 || maybeError.statusCode === 409;
};

const getUsersContainer = async (): Promise<Container> => {
  if (cachedUsersContainer) return cachedUsersContainer;

  const container = await getContainer(USERS_CONTAINER_ID, {
    partitionKeyPath: PARTITION_KEY_PATH,
    uniqueKeyPaths: ["/name"],
  });

  cachedUsersContainer = container;
  return container;
};

const normalizeUser = (user: unknown): UserRecord => {
  const parsed = cosmosUserSchema.parse(user);

  return {
    id: parsed.id,
    name: parsed.name,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt ?? parsed.createdAt,
  };
};

export const findUserByName = async (
  name: string,
): Promise<UserRecord | null> => {
  const container = await getUsersContainer();
  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.name = @name",
    parameters: [{ name: "@name", value: name }],
  };

  const { resources } = await container.items
    .query<Record<string, unknown>>(querySpec)
    .fetchAll();

  const [user] = resources;
  if (!user) return null;

  return normalizeUser(user);
};

export const createUser = async (name: string): Promise<UserRecord> => {
  const container = await getUsersContainer();
  const now = new Date().toISOString();

  const newUser: UserRecord = {
    id: randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await container.items.create(newUser);
    return newUser;
  } catch (error) {
    if (isConflictError(error)) {
      const existing = await findUserByName(name);
      if (existing) return existing;
    }

    throw error;
  }
};

export const touchUser = async (user: UserRecord): Promise<UserRecord> => {
  const container = await getUsersContainer();
  const updated: UserRecord = {
    ...user,
    updatedAt: new Date().toISOString(),
  };

  await container.item(user.id, user.name).replace(updated);
  return updated;
};

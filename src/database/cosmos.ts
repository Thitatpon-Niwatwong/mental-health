import { CosmosClient, Container, Database } from "@azure/cosmos";
import type { ContainerRequest, UniqueKeyPolicy } from "@azure/cosmos";
import { env } from "../config/env.js";

type CosmosConnection = { client: CosmosClient; database: Database };

let cachedConnection: CosmosConnection | null = null;
const containerCache = new Map<string, Container>();

export const connectToCosmos = async (): Promise<CosmosConnection> => {
  if (cachedConnection) return cachedConnection;

  if (!env.cosmos.endpoint) throw new Error("COSMOS_DB_ENDPOINT is missing");
  if (!env.cosmos.key) throw new Error("COSMOS_DB_KEY is missing");
  if (!env.cosmos.dbName) throw new Error("COSMOS_DB_NAME is missing");

  const client = new CosmosClient({
    endpoint: env.cosmos.endpoint,
    key: env.cosmos.key,
  });
  // Ensure database exists (idempotent). This also validates endpoint/key.
  const { database } = await client.databases.createIfNotExists({
    id: env.cosmos.dbName,
  });

  cachedConnection = { client, database };
  return cachedConnection;
};

export const getContainer = async (
  containerId: string,
  options: { partitionKeyPath: string; uniqueKeyPaths?: string[] },
): Promise<Container> => {
  if (containerCache.has(containerId)) {
    return containerCache.get(containerId)!;
  }

  const connection = await connectToCosmos();
  const request: ContainerRequest = {
    id: containerId,
    partitionKey: {
      paths: [options.partitionKeyPath],
    },
  };

  if (options.uniqueKeyPaths && options.uniqueKeyPaths.length > 0) {
    const uniqueKeyPolicy: UniqueKeyPolicy = {
      uniqueKeys: options.uniqueKeyPaths.map((path) => ({ paths: [path] })),
    };
    request.uniqueKeyPolicy = uniqueKeyPolicy;
  }

  const { container } =
    await connection.database.containers.createIfNotExists(request);

  containerCache.set(containerId, container);
  return container;
};

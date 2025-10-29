import { CosmosClient, Database } from '@azure/cosmos';
import { env } from '../config/env.js';

type CosmosConnection = { client: CosmosClient; database: Database };

let cachedConnection: CosmosConnection | null = null;

export const connectToCosmos = async (): Promise<CosmosConnection> => {
  if (cachedConnection) return cachedConnection;

  if (!env.cosmos.endpoint) throw new Error('COSMOS_DB_ENDPOINT is missing');
  if (!env.cosmos.key) throw new Error('COSMOS_DB_KEY is missing');
  if (!env.cosmos.dbName) throw new Error('COSMOS_DB_NAME is missing');

  const client = new CosmosClient({ endpoint: env.cosmos.endpoint, key: env.cosmos.key });
  // Ensure database exists (idempotent). This also validates endpoint/key.
  const { database } = await client.databases.createIfNotExists({ id: env.cosmos.dbName });

  cachedConnection = { client, database };
  return cachedConnection;
};

import { config } from "dotenv";
import { z } from "zod";

config();

const EnvSchema = z.object({
  PORT: z
    .string()
    .default("3000")
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().positive()),
  COSMOS_DB_ENDPOINT: z.string().min(1, "COSMOS_DB_ENDPOINT is required"),
  COSMOS_DB_KEY: z.string().min(1, "COSMOS_DB_KEY is required"),
  COSMOS_DB_NAME: z.string().min(1, "COSMOS_DB_NAME is required"),
  // Optional: allow a full Mongo connection URI override
  COSMOS_DB_URI: z.string().min(1).optional(),
});

const parsed = EnvSchema.parse({
  PORT: process.env.PORT,
  COSMOS_DB_ENDPOINT: process.env.COSMOS_DB_ENDPOINT,
  COSMOS_DB_KEY: process.env.COSMOS_DB_KEY,
  COSMOS_DB_NAME: process.env.COSMOS_DB_NAME,
  COSMOS_DB_URI: process.env.COSMOS_DB_URI,
});

export const env = {
  port: parsed.PORT,
  cosmos: {
    endpoint: parsed.COSMOS_DB_ENDPOINT,
    key: parsed.COSMOS_DB_KEY,
    dbName: parsed.COSMOS_DB_NAME,
    uri: parsed.COSMOS_DB_URI,
  },
};

import OpenAI from "openai";
import { env } from "../config/env.js";

export const getOpenAIClient = (): OpenAI => {
  if (!env.openai.apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please set it in your environment to generate plans.",
    );
  }
  return new OpenAI({ apiKey: env.openai.apiKey });
};

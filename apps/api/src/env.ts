import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(8080),
  GOOGLE_CLIENT_ID: z.string().min(1),
  JWT_SECRET: z.string().min(1).default("default_secret"),
  GITHUB_API_TOKEN: z.string().min(1).optional(),
  JDOODLE_CLIENT_ID: z.string().min(1).optional(),
  JDOODLE_CLIENT_SECRET: z.string().min(1).optional(),
  FRONTEND_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

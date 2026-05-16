import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(8080),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  GITHUB_API_TOKEN: z.string().min(1).optional()
});

export const env = envSchema.parse(process.env);

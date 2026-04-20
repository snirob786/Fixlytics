import { z } from "zod";

const DEV_JWT_PLACEHOLDER = "development-only-secret-min-32-chars!!";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  REDIS_URL: z
    .string()
    .min(1)
    .default("redis://127.0.0.1:6379")
    .refine(
      (v) => v.startsWith("redis://") || v.startsWith("rediss://"),
      "REDIS_URL must be a Redis connection string",
    ),
  SCRAPER_MODE: z.enum(["fixture", "http"]).default("fixture"),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
});

export type ValidatedEnv = z.infer<typeof envSchema> & { JWT_SECRET: string };

export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  const merged: Record<string, unknown> = { ...process.env, ...config };
  const nodeEnv = (merged.NODE_ENV as string) ?? "development";

  if (nodeEnv === "production" && !merged.JWT_SECRET) {
    throw new Error("JWT_SECRET is required when NODE_ENV is production (min 32 characters)");
  }

  if (!merged.JWT_SECRET) {
    merged.JWT_SECRET = DEV_JWT_PLACEHOLDER;
  }

  const parsed = envSchema.safeParse(merged);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${msg}`);
  }

  const secret = parsed.data.JWT_SECRET ?? DEV_JWT_PLACEHOLDER;
  if (nodeEnv === "production" && secret === DEV_JWT_PLACEHOLDER) {
    throw new Error("JWT_SECRET cannot use the development placeholder in production");
  }

  return { ...parsed.data, JWT_SECRET: secret };
}

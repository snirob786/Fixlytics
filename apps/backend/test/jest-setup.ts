process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/fixlytics_test";
process.env.JWT_SECRET ??= "development-only-secret-min-32-chars!!";
process.env.FRONTEND_ORIGIN ??= "http://localhost:3000";
process.env.REDIS_URL ??= "redis://127.0.0.1:6379";
process.env.SCRAPER_MODE ??= "fixture";
process.env.USE_JOB_QUEUE ??= "false";

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (
    typeof first === "string" &&
    first.includes("Eviction policy") &&
    first.includes("noeviction")
  ) {
    return;
  }
  originalWarn(...(args as Parameters<typeof console.warn>));
};

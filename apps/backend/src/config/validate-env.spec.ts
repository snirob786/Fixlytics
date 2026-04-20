import { validateEnv } from "./validate-env";

describe("validateEnv", () => {
  const base = {
    NODE_ENV: "development",
    PORT: "4000",
    DATABASE_URL: "postgresql://u:p@localhost:5432/fixlytics",
    FRONTEND_ORIGIN: "http://localhost:3000",
  };

  beforeEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("accepts valid development config with implicit JWT", () => {
    const result = validateEnv({ ...base });
    expect(result.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(result.DATABASE_URL).toContain("postgresql://");
  });

  it("throws when production is missing JWT_SECRET", () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: "production",
        JWT_SECRET: undefined,
      }),
    ).toThrow(/JWT_SECRET is required/);
  });

  it("throws when production uses development JWT placeholder", () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: "production",
        JWT_SECRET: "development-only-secret-min-32-chars!!",
      }),
    ).toThrow(/cannot use the development placeholder/);
  });
});

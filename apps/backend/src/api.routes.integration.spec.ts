import { INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { SearchSource } from "@prisma/client";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "./app.module";
import { AuthService } from "./modules/auth/auth.service";
import { LeadsService } from "./modules/leads/leads.service";
import { SearchesService } from "./modules/searches/searches.service";
import { PrismaService } from "./prisma/prisma.service";

/** Valid `ParseResourceIdPipe` id (c + 24 lowercase alnum = 25 chars). */
const SEARCH_ID = `c${"0".repeat(24)}`;
const LEAD_ID = `c${"1".repeat(24)}`;

describe("HTTP API routes (integration smoke)", () => {
  let app: INestApplication;
  let jwt: JwtService;

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation((args: { where: { id?: string; email?: string } }) => {
        if (args.where.id === "user-1") {
          return Promise.resolve({
            id: "user-1",
            email: "dev@fixlytics.local",
            passwordHash: "x",
          });
        }
        return Promise.resolve(null);
      }),
    },
    refreshToken: {},
  };

  const authMock: Pick<AuthService, "register" | "login" | "refresh" | "logout"> = {
    register: jest.fn().mockResolvedValue({
      accessToken: "mock-access-register",
      refreshToken: "0".repeat(64),
      user: { id: "user-1", email: "dev@fixlytics.local" },
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: "mock-access-login",
      refreshToken: "1".repeat(64),
      user: { id: "user-1", email: "dev@fixlytics.local" },
    }),
    refresh: jest.fn().mockResolvedValue({
      accessToken: "mock-access-refresh",
      refreshToken: "2".repeat(64),
      user: { id: "user-1", email: "dev@fixlytics.local" },
    }),
    logout: jest.fn().mockResolvedValue(undefined),
  };

  const searchesMock: Pick<
    SearchesService,
    | "create"
    | "list"
    | "listLeads"
    | "getCachedPage"
    | "getDetail"
    | "update"
    | "remove"
    | "enqueueRun"
    | "getLatestRunStatus"
    | "listSearchRuns"
  > = {
    create: jest.fn().mockResolvedValue({
      id: SEARCH_ID,
      keyword: "plumber",
      location: "Austin",
      source: SearchSource.GOOGLE,
      cursorPage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leadCount: 0,
    }),
    list: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasNext: false,
    }),
    listLeads: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasNext: false,
    }),
    getCachedPage: jest.fn().mockResolvedValue({
      pageIndex: 0,
      truncated: false,
      rawPayload: { fixture: true },
    }),
    getDetail: jest.fn().mockResolvedValue({
      id: SEARCH_ID,
      keyword: "plumber",
      location: "Austin",
      source: SearchSource.GOOGLE,
      cursorPage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leadCount: 0,
      cachedPages: 0,
    }),
    update: jest.fn().mockResolvedValue({
      id: SEARCH_ID,
      keyword: "hvac",
      location: "Austin",
      source: SearchSource.GOOGLE,
      cursorPage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    remove: jest.fn().mockResolvedValue(undefined),
    enqueueRun: jest.fn().mockResolvedValue({ runId: `c${"b".repeat(24)}` }),
    getLatestRunStatus: jest.fn().mockResolvedValue({ latestRun: null }),
    listSearchRuns: jest.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasNext: false,
    }),
  };

  const leadsMock: Pick<LeadsService, "getDetail" | "listGlobal"> = {
    getDetail: jest.fn().mockResolvedValue({
      id: LEAD_ID,
      url: "https://example.com",
      title: "Example",
      createdAt: new Date().toISOString(),
      search: {
        id: SEARCH_ID,
        keyword: "plumber",
        location: "Austin",
        source: SearchSource.GOOGLE,
      },
      analysis: null,
    }),
    listGlobal: jest.fn().mockResolvedValue({
      items: [],
      hasNext: false,
      nextCursor: null,
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthService)
      .useValue(authMock)
      .overrideProvider(SearchesService)
      .useValue(searchesMock)
      .overrideProvider(LeadsService)
      .useValue(leadsMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /api/v1/auth/register", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/auth/register").send({
      email: "new@fixlytics.local",
      password: "longpassword1",
    });
    expect(res.status).toBe(201);
    expect(authMock.register).toHaveBeenCalled();
    expect(res.body.user?.email).toBe("dev@fixlytics.local");
  });

  it("POST /api/v1/auth/login", async () => {
    const res = await request(app.getHttpServer()).post("/api/v1/auth/login").send({
      email: "dev@fixlytics.local",
      password: "longpassword1",
    });
    expect(res.status).toBe(201);
    expect(authMock.login).toHaveBeenCalled();
  });

  it("POST /api/v1/auth/refresh", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "3".repeat(64) });
    expect(res.status).toBe(201);
    expect(authMock.refresh).toHaveBeenCalled();
  });

  it("POST /api/v1/auth/logout", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .send({ refreshToken: "4".repeat(64) });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  it("GET /api/v1/auth/me (Bearer)", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "user-1", email: "dev@fixlytics.local" });
  });

  it("POST /api/v1/searches", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .post("/api/v1/searches")
      .set("Authorization", `Bearer ${token}`)
      .send({
        keyword: "plumber",
        location: "Austin, TX",
        source: "GOOGLE",
      });
    expect(res.status).toBe(201);
    expect(searchesMock.create).toHaveBeenCalled();
  });

  it("GET /api/v1/searches", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get("/api/v1/searches")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchesMock.list).toHaveBeenCalled();
  });

  it("GET /api/v1/searches/:id/status", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/searches/${SEARCH_ID}/status`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchesMock.getLatestRunStatus).toHaveBeenCalledWith("user-1", SEARCH_ID);
  });

  it("GET /api/v1/searches/:id/runs", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/searches/${SEARCH_ID}/runs`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchesMock.listSearchRuns).toHaveBeenCalled();
  });

  it("GET /api/v1/searches/:id/leads", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/searches/${SEARCH_ID}/leads`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchesMock.listLeads).toHaveBeenCalled();
  });

  it("GET /api/v1/searches/:id/cache/:pageIndex", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/searches/${SEARCH_ID}/cache/0`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchesMock.getCachedPage).toHaveBeenCalledWith("user-1", SEARCH_ID, 0);
  });

  it("GET /api/v1/searches/:id/cache/:pageIndex rejects non-integer pageIndex", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/searches/${SEARCH_ID}/cache/x`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("GET /api/v1/searches/:id rejects invalid id", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get("/api/v1/searches/not-a-cuid")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("GET /api/v1/searches/:id", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/searches/${SEARCH_ID}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchesMock.getDetail).toHaveBeenCalled();
  });

  it("PATCH /api/v1/searches/:id", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/searches/${SEARCH_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ keyword: "hvac" });
    expect(res.status).toBe(200);
    expect(searchesMock.update).toHaveBeenCalled();
  });

  it("DELETE /api/v1/searches/:id", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/searches/${SEARCH_ID}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(searchesMock.remove).toHaveBeenCalled();
  });

  it("POST /api/v1/searches/:id/run", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .post(`/api/v1/searches/${SEARCH_ID}/run`)
      .set("Authorization", `Bearer ${token}`)
      .send({ resume: false });
    expect(res.status).toBe(201);
    expect(searchesMock.enqueueRun).toHaveBeenCalledWith("user-1", SEARCH_ID, false);
  });

  it("GET /api/v1/leads", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer()).get("/api/v1/leads").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(leadsMock.listGlobal).toHaveBeenCalled();
  });

  it("GET /api/v1/leads/:id", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "dev@fixlytics.local" });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/leads/${LEAD_ID}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(leadsMock.getDetail).toHaveBeenCalledWith("user-1", LEAD_ID);
  });
});

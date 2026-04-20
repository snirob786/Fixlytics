import { getQueueToken } from "@nestjs/bullmq";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "./app.module";
import { PIPELINE_QUEUE } from "./modules/jobs/pipeline.constants";
import { PrismaService } from "./prisma/prisma.service";

describe("AppModule (integration)", () => {
  let app: INestApplication;

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {},
    refreshToken: {},
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    try {
      const queue = app.get(getQueueToken(PIPELINE_QUEUE));
      await queue.close();
    } catch {
      // queue may be unavailable if module wiring changes
    }
    await app.close();
  });

  it("GET /api/v1/health returns 200", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

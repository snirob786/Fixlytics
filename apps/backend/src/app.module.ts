import { BullModule } from "@nestjs/bullmq";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import Redis from "ioredis";
import { AppController } from "./app.controller";
import { validateEnv } from "./config/validate-env";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { PipelineModule } from "./modules/jobs/pipeline.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { SearchesModule } from "./modules/searches/searches.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

function isJobQueueEnabled(): boolean {
  const raw = process.env.USE_JOB_QUEUE?.trim().toLowerCase();
  if (raw === undefined || raw === "") return false;
  return raw === "true" || raw === "1" || raw === "yes";
}

const useJobQueue = isJobQueueEnabled();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ...(useJobQueue
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => {
              const url = config.getOrThrow<string>("REDIS_URL");
              const logger = new Logger("BullRedis");
              const connection = new Redis(url, { maxRetriesPerRequest: null });
              connection.on("error", (err: NodeJS.ErrnoException) => {
                logger.warn(
                  `Redis connection error (${err.code ?? "unknown"}): ${err.message} — queue will retry`,
                );
              });
              return { connection };
            },
            inject: [ConfigService],
          }),
          PipelineModule,
        ]
      : []),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    SearchesModule.register(useJobQueue),
    LeadsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}

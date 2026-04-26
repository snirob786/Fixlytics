import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { validateEnv } from "./config/validate-env";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { ExploreModule } from "./modules/explore/explore.module";
// TODO: re-enable BullMQ + Redis + PipelineModule when async jobs return.
// import { BullModule } from "@nestjs/bullmq";
// import { ConfigService } from "@nestjs/config";
// import { Logger } from "@nestjs/common";
// import Redis from "ioredis";
// import { PipelineModule } from "./modules/jobs/pipeline.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { SearchesModule } from "./modules/searches/searches.module";
import { SearchModule } from "./modules/search/search.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./modules/queue/queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ExploreModule,
    SearchModule,
    SearchesModule,
    LeadsModule,
    QueueModule,
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

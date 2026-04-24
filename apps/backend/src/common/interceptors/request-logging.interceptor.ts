import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

type RequestWithMeta = Request & { requestId?: string; user?: { userId?: string } };

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<RequestWithMeta>();
    const requestId =
      typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].length > 0
        ? req.headers["x-request-id"]
        : randomUUID();
    req.requestId = requestId;
    const started = Date.now();
    const route = req.route?.path ? `${req.method} ${req.baseUrl ?? ""}${req.route.path}` : `${req.method} ${req.url}`;
    const userId = req.user?.userId ?? null;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `requestId=${requestId} route=${route} userId=${userId ?? "—"} ms=${Date.now() - started}`,
          );
        },
        error: () => {
          this.logger.warn(
            `requestId=${requestId} route=${route} userId=${userId ?? "—"} ms=${Date.now() - started} error`,
          );
        },
      }),
    );
  }
}

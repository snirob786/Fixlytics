import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === "production";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (typeof body === "object" && body !== null && "message" in body) {
        const m = (body as { message?: string | string[] }).message;
        message = m ?? message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = isProd ? "Internal server error" : exception.message;
    } else {
      this.logger.error("Unhandled exception", String(exception));
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      message,
    });
  }
}

import type { ApiErrorBody } from "@fixlytics/types";
import { getApiBaseUrl } from "./api";

export class ApiError extends Error {
  constructor(
    public readonly body: ApiErrorBody,
    public readonly status: number,
  ) {
    super(
      typeof body.message === "string"
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(", ")
          : "Request failed",
    );
    this.name = "ApiError";
  }
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const body = data as ApiErrorBody;
    throw new ApiError(
      {
        statusCode: body.statusCode ?? res.status,
        path: body.path ?? path,
        message: body.message ?? res.statusText,
      },
      res.status,
    );
  }
  return data as T;
}

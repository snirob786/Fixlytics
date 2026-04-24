const MAX_RETURN_BYTES = 512 * 1024;

export type CachedPageResponseDto =
  | { pageIndex: number; truncated: false; rawPayload: unknown }
  | {
      pageIndex: number;
      truncated: true;
      approximateSizeBytes: number;
      preview: string;
      warning: string;
    };

export function toCachedPageResponse(pageIndex: number, rawPayload: unknown): CachedPageResponseDto {
  const json = JSON.stringify(rawPayload ?? null);
  const sizeBytes = Buffer.byteLength(json, "utf8");
  if (sizeBytes <= MAX_RETURN_BYTES) {
    return { pageIndex, truncated: false, rawPayload };
  }
  return {
    pageIndex,
    truncated: true,
    approximateSizeBytes: sizeBytes,
    preview: json.slice(0, 4000),
    warning:
      "Payload exceeded the safe return size limit; only a text preview is included. Store or process large caches server-side if needed.",
  };
}

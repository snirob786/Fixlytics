const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function getApiBaseUrl() {
  return apiBaseUrl.replace(/\/$/, "");
}

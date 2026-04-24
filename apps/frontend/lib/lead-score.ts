/** Mirrors backend UNDERPERFORMING_AVG_THRESHOLD for client-side display only. */
export const UNDERPERFORMING_AVG_THRESHOLD = 58;

export function isUnderperformingAvg(avg: number | null | undefined): boolean {
  return avg != null && avg < UNDERPERFORMING_AVG_THRESHOLD;
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 48);
  }
}

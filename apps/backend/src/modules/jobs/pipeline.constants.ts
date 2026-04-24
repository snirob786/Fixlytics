export const PIPELINE_QUEUE = "pipeline" as const;

export const JOB_SCRAPE_SEARCH = "scrape-search" as const;
export const JOB_ANALYZE_LEAD = "analyze-lead" as const;

export const DAILY_JOB_RUN_LIMIT = 100;

/** Cap leads processed from one scraped page per job (prevents DB / queue explosion). */
export const MAX_LEADS_PER_SCRAPE_ITERATION = 100;

/** Cap analyze jobs chained from one scrape iteration (analyzer is optional product-wise but queue exists). */
export const MAX_ANALYZE_ENQUEUE_PER_SCRAPE_ITERATION = 20;

export const MAX_SEARCH_RUN_ERROR_LENGTH = 500;

export type ScrapeSearchJobData = {
  searchId: string;
  userId: string;
  resume: boolean;
  searchRunId: string;
};

export type AnalyzeLeadJobData = {
  leadId: string;
  userId: string;
};

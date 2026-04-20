export const PIPELINE_QUEUE = "pipeline" as const;

export const JOB_SCRAPE_SEARCH = "scrape-search" as const;
export const JOB_ANALYZE_LEAD = "analyze-lead" as const;

export const DAILY_JOB_RUN_LIMIT = 100;

export type ScrapeSearchJobData = {
  searchId: string;
  userId: string;
  resume: boolean;
};

export type AnalyzeLeadJobData = {
  leadId: string;
  userId: string;
};

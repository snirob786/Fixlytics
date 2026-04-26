export const SEARCH_QUEUE = "searchQueue" as const;
export const ENRICHMENT_QUEUE = "enrichmentQueue" as const;

export const SEARCH_JOB = "search-job" as const;
export const ENRICH_DOMAIN_JOB = "enrich-domain-job" as const;

export type SearchJobData = {
  searchId: string;
  hash: string;
  query: string;
  platform?: string;
  area?: string;
  keyword: string;
};

export type EnrichmentJobData = {
  domainId: string;
  keyword: string;
  area?: string;
};

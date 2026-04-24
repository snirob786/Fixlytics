export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};

export function buildPaginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): PaginatedResponse<T> {
  const hasNext = page * pageSize < total;
  return { items, page, pageSize, total, hasNext };
}

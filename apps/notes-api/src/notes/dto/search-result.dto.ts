/**
 * DTO for search result item
 * Story 3.5 - Task 2
 * AC: 7 - Search result with highlighted snippets and relevance ranking
 */
export class SearchResultDto {
  /**
   * Note UUID
   */
  id: string;

  /**
   * Note title (may contain highlighted terms)
   */
  title: string;

  /**
   * Highlighted excerpt from content showing matching terms
   * Generated using PostgreSQL ts_headline function
   * Matching terms wrapped in <mark> tags
   */
  snippet: string;

  /**
   * Relevance score (0-1)
   * Calculated using PostgreSQL ts_rank function
   * Higher scores indicate better matches
   */
  rank: number;

  /**
   * Folder ID or null if note is in root
   */
  folder_id: string | null;

  /**
   * Whether note is pinned
   */
  is_pinned: boolean;

  /**
   * Last update timestamp
   */
  updated_at: Date;
}

/**
 * Paginated search response with metadata
 * Story 3.5 - Task 2, 8
 */
export interface SearchResponse {
  data: SearchResultDto[];
  meta: {
    query: string;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

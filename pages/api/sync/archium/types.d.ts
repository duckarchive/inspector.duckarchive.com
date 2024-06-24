interface SyncArchiumResponse {
  created_at: Date;
  match_id: string;
  total: number;
  diff: number;
  error?: string;
}

interface FetchArchiumResponse {
  created_at: Date;
  match_id: string;
  total: number;
  added: number;
  removed: number;
  error?: string;
}
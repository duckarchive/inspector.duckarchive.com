interface SyncArchiumResponse {
  created_at: Date;
  match_id: string;
  total: number;
  diff: number;
  error?: string;
}
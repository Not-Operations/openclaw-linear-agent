export interface ApiHealthResponse {
  ok: true;
  service: string;
}

export interface ApiAuthStatusResponse {
  ok: boolean;
  linear?: {
    connected: boolean;
    viewerName?: string;
    viewerId?: string;
    organizationName?: string;
    organizationId?: string;
    tokenSource?: 'existing' | 'refreshed';
    updatedAt?: string;
  };
  error?: string;
}

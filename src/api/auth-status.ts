import { getValidAccessToken } from '../linear-token.js';
import type { ApiAuthStatusResponse } from '../contracts/api.js';

export async function getAuthStatus(): Promise<ApiAuthStatusResponse> {
  try {
    const result = await getValidAccessToken();
    return {
      ok: true,
      linear: {
        connected: true,
        viewerName: result.viewer.viewer?.name,
        viewerId: result.viewer.viewer?.id,
        organizationName: result.viewer.organization?.name,
        organizationId: result.viewer.organization?.id,
        tokenSource: result.source,
        updatedAt: result.updatedAt
      }
    };
  } catch (error: any) {
    return {
      ok: false,
      linear: {
        connected: false
      },
      error: error?.message ?? String(error)
    };
  }
}

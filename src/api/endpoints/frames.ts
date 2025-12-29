import { getClient } from "../client.js";
import type { FrameResponse, FrameResource } from "../types.js";

/**
 * Get frame (household) information
 */
export async function getFrame(): Promise<FrameResource> {
  const client = getClient();
  const response = await client.get<FrameResponse>("/api/frames/{frameId}");
  return response.data;
}

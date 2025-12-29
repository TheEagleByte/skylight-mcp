import { getClient } from "../client.js";
import type { DevicesResponse, DeviceResource } from "../types.js";

/**
 * Get all Skylight devices in the household
 */
export async function getDevices(): Promise<DeviceResource[]> {
  const client = getClient();
  const response = await client.get<DevicesResponse>("/api/frames/{frameId}/devices");
  return response.data;
}

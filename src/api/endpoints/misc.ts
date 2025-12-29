import { getClient } from "../client.js";

export interface AvatarResource {
  type: "avatar";
  id: string;
  attributes: {
    name?: string;
    url?: string;
    [key: string]: unknown;
  };
}

export interface ColorResource {
  type: "color";
  id: string;
  attributes: {
    name?: string;
    hex?: string;
    [key: string]: unknown;
  };
}

interface AvatarsResponse {
  data: AvatarResource[];
}

interface ColorsResponse {
  data: ColorResource[];
}

/**
 * Get available avatar options
 */
export async function getAvatars(): Promise<AvatarResource[]> {
  const client = getClient();
  const response = await client.get<AvatarsResponse>("/api/avatars");
  return response.data;
}

/**
 * Get available color options
 */
export async function getColors(): Promise<ColorResource[]> {
  const client = getClient();
  const response = await client.get<ColorsResponse>("/api/colors");
  return response.data;
}

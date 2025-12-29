import { getClient } from "../client.js";

export interface AlbumResource {
  type: "album";
  id: string;
  attributes: {
    name?: string;
    [key: string]: unknown;
  };
}

interface AlbumsResponse {
  data: AlbumResource[];
}

/**
 * Get photo albums
 */
export async function getAlbums(): Promise<AlbumResource[]> {
  const client = getClient();
  const response = await client.get<AlbumsResponse>("/api/frames/{frameId}/albums");
  return response.data;
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getAlbums } from "../api/endpoints/photos.js";
import { formatErrorForMcp } from "../utils/errors.js";

export function registerPhotoTools(server: McpServer): void {
  // get_albums tool
  server.tool(
    "get_albums",
    `Get photo albums from Skylight - Plus subscription required.

Use this when:
- Viewing available photo albums
- Getting album IDs for photo management

Returns: List of photo albums with their IDs.`,
    {},
    async () => {
      try {
        const albums = await getAlbums();

        if (albums.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No photo albums found." }],
          };
        }

        const list = albums
          .map((album) => {
            const parts = [`- ${album.attributes.name ?? "Untitled Album"} (ID: ${album.id})`];
            for (const [key, value] of Object.entries(album.attributes)) {
              if (value !== null && value !== undefined && key !== "name") {
                parts.push(`  ${key}: ${value}`);
              }
            }
            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [{ type: "text" as const, text: `Photo albums:\n\n${list}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );
}

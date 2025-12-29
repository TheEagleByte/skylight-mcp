import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getAvatars, getColors } from "../api/endpoints/misc.js";
import { formatErrorForMcp } from "../utils/errors.js";

export function registerMiscTools(server: McpServer): void {
  // get_avatars tool
  server.tool(
    "get_avatars",
    `Get available avatar options for Skylight profiles.

Use this when:
- Setting up a new family member profile
- Changing someone's profile picture
- Exploring available avatar options

Returns: List of available avatars with their IDs and details.`,
    {},
    async () => {
      try {
        const avatars = await getAvatars();

        if (avatars.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No avatars found.",
              },
            ],
          };
        }

        const avatarList = avatars
          .map((avatar) => {
            const parts = [`- Avatar (ID: ${avatar.id})`];
            for (const [key, value] of Object.entries(avatar.attributes)) {
              if (value !== null && value !== undefined) {
                parts.push(`  ${key}: ${value}`);
              }
            }
            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Available avatars:\n\n${avatarList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );

  // get_colors tool
  server.tool(
    "get_colors",
    `Get available color options for Skylight profiles and lists.

Use this when:
- Choosing a color for a family member profile
- Setting a list color
- Exploring available color options

Returns: List of available colors with their IDs and hex values.`,
    {},
    async () => {
      try {
        const colors = await getColors();

        if (colors.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No colors found.",
              },
            ],
          };
        }

        const colorList = colors
          .map((color) => {
            const parts = [`- Color (ID: ${color.id})`];
            for (const [key, value] of Object.entries(color.attributes)) {
              if (value !== null && value !== undefined) {
                parts.push(`  ${key}: ${value}`);
              }
            }
            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Available colors:\n\n${colorList}`,
            },
          ],
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

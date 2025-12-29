import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getRewards, getRewardPoints } from "../api/endpoints/rewards.js";
import { formatErrorForMcp } from "../utils/errors.js";

export function registerRewardTools(server: McpServer): void {
  // get_rewards tool
  server.tool(
    "get_rewards",
    `Get available rewards that can be redeemed with reward points.

For family gamification - shows rewards that family members can earn.

Use this to answer:
- "What rewards can we redeem?"
- "What can the kids earn?"
- "Show available rewards"`,
    {
      redeemedSince: z
        .string()
        .optional()
        .describe("Filter to rewards redeemed after this date (ISO datetime)"),
    },
    async ({ redeemedSince }) => {
      try {
        const rewards = await getRewards({
          redeemedAtMin: redeemedSince,
        });

        if (rewards.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No rewards found.",
              },
            ],
          };
        }

        const rewardList = rewards
          .map((reward) => {
            const parts = [`- Reward (ID: ${reward.id})`];

            const attrs = reward.attributes;
            for (const [key, value] of Object.entries(attrs)) {
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
              text: `Available rewards:\n\n${rewardList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatErrorForMcp(error as Error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // get_reward_points tool
  server.tool(
    "get_reward_points",
    `Get reward points balance for family members.

Shows how many reward points each family member has earned.

Use this to answer:
- "How many points does [name] have?"
- "Show reward points balance"
- "Who has the most points?"`,
    {},
    async () => {
      try {
        const points = await getRewardPoints();

        if (points.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No reward points found.",
              },
            ],
          };
        }

        const pointsList = points
          .map((point) => {
            const parts = [`- Points (ID: ${point.id})`];

            const attrs = point.attributes;
            for (const [key, value] of Object.entries(attrs)) {
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
              text: `Reward points:\n\n${pointsList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatErrorForMcp(error as Error),
            },
          ],
          isError: true,
        };
      }
    }
  );
}

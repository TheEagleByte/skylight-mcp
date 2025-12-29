import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getRewards,
  getRewardPoints,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
  unredeemReward,
} from "../api/endpoints/rewards.js";
import { findCategoryByName } from "../api/endpoints/categories.js";
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
              text: formatErrorForMcp(error),
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
              text: formatErrorForMcp(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // create_reward tool
  server.tool(
    "create_reward",
    `Create a new reward that can be redeemed with points (Plus subscription required).

Use this when:
- Adding a new reward: "Create a reward for 30 minutes of screen time"
- Setting up family incentives: "Add a pizza night reward worth 100 points"

Parameters:
- name (required): Reward name (e.g., "30 min Screen Time")
- pointValue (required): Points needed to redeem this reward
- description: Additional details about the reward
- emojiIcon: Emoji to display with the reward
- assignee: Family member name to assign this reward to
- respawnOnRedemption: If true, reward can be redeemed multiple times

Returns: The created reward details.`,
    {
      name: z.string().describe("Reward name (e.g., '30 min Screen Time')"),
      pointValue: z.number().describe("Points needed to redeem this reward"),
      description: z.string().optional().describe("Additional details about the reward"),
      emojiIcon: z.string().optional().describe("Emoji for the reward (e.g., '🎮')"),
      assignee: z.string().optional().describe("Family member to assign this reward to"),
      respawnOnRedemption: z.boolean().optional().default(false).describe("Can be redeemed multiple times"),
    },
    async ({ name, pointValue, description, emojiIcon, assignee, respawnOnRedemption }) => {
      try {
        let categoryIds: string[] | undefined;
        if (assignee) {
          const category = await findCategoryByName(assignee);
          if (!category) {
            return {
              content: [{ type: "text" as const, text: `Could not find family member "${assignee}"` }],
              isError: true,
            };
          }
          categoryIds = [category.id];
        }

        const reward = await createReward({
          name,
          pointValue,
          description,
          emojiIcon,
          categoryIds,
          respawnOnRedemption,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Created reward "${name}" worth ${pointValue} points (ID: ${reward.id})`,
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

  // update_reward tool
  server.tool(
    "update_reward",
    `Update an existing reward (Plus subscription required).

Use this when:
- Changing point value: "Make the screen time reward cost 50 points"
- Updating reward details: "Add a description to the pizza reward"

Parameters:
- rewardId (required): ID of the reward (from get_rewards)
- name: New reward name
- pointValue: New point cost
- description: Updated description
- emojiIcon: Updated emoji

Returns: The updated reward details.`,
    {
      rewardId: z.string().describe("ID of the reward to update"),
      name: z.string().optional().describe("New reward name"),
      pointValue: z.number().optional().describe("New point cost"),
      description: z.string().nullable().optional().describe("Updated description (null to clear)"),
      emojiIcon: z.string().nullable().optional().describe("Updated emoji (null to clear)"),
      respawnOnRedemption: z.boolean().optional().describe("Can be redeemed multiple times"),
    },
    async ({ rewardId, name, pointValue, description, emojiIcon, respawnOnRedemption }) => {
      try {
        const updates: Parameters<typeof updateReward>[1] = {};
        if (name !== undefined) updates.name = name;
        if (pointValue !== undefined) updates.pointValue = pointValue;
        if (description !== undefined) updates.description = description;
        if (emojiIcon !== undefined) updates.emojiIcon = emojiIcon;
        if (respawnOnRedemption !== undefined) updates.respawnOnRedemption = respawnOnRedemption;

        const reward = await updateReward(rewardId, updates);

        return {
          content: [
            {
              type: "text" as const,
              text: `Updated reward (ID: ${reward.id})`,
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

  // delete_reward tool
  server.tool(
    "delete_reward",
    `Delete a reward (Plus subscription required).

Use this when:
- Removing an old reward
- Cleaning up unused rewards

Parameters:
- rewardId (required): ID of the reward to delete (from get_rewards)

Note: This permanently removes the reward.`,
    {
      rewardId: z.string().describe("ID of the reward to delete"),
    },
    async ({ rewardId }) => {
      try {
        await deleteReward(rewardId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Deleted reward (ID: ${rewardId})`,
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

  // redeem_reward tool
  server.tool(
    "redeem_reward",
    `Redeem a reward using points (Plus subscription required).

Use this when:
- A family member wants to cash in points: "Redeem the screen time reward for Johnny"
- Claiming an earned reward

Parameters:
- rewardId (required): ID of the reward to redeem (from get_rewards)
- assignee: Family member redeeming the reward (uses their points)

Returns: The redeemed reward details.`,
    {
      rewardId: z.string().describe("ID of the reward to redeem"),
      assignee: z.string().optional().describe("Family member redeeming the reward"),
    },
    async ({ rewardId, assignee }) => {
      try {
        let categoryId: string | undefined;
        if (assignee) {
          const category = await findCategoryByName(assignee);
          if (!category) {
            return {
              content: [{ type: "text" as const, text: `Could not find family member "${assignee}"` }],
              isError: true,
            };
          }
          categoryId = category.id;
        }

        const reward = await redeemReward(rewardId, categoryId);

        return {
          content: [
            {
              type: "text" as const,
              text: `Redeemed reward (ID: ${reward.id})${assignee ? ` for ${assignee}` : ""}`,
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

  // unredeem_reward tool
  server.tool(
    "unredeem_reward",
    `Cancel a reward redemption (Plus subscription required).

Use this when:
- A redemption was made by mistake
- Undoing a reward claim

Parameters:
- rewardId (required): ID of the reward to unredeem

Returns: The unredeemed reward details.`,
    {
      rewardId: z.string().describe("ID of the reward to unredeem"),
    },
    async ({ rewardId }) => {
      try {
        const reward = await unredeemReward(rewardId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Unredeemed reward (ID: ${reward.id})`,
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

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createTaskBoxItem } from "../api/endpoints/taskbox.js";
import { formatErrorForMcp } from "../utils/errors.js";

export function registerTaskTools(server: McpServer): void {
  // create_task tool
  server.tool(
    "create_task",
    `Add a task to the Skylight task box.

The task box holds unscheduled tasks that can later be assigned to specific dates.

Use this when the user says:
- "Add XYZ to my task list"
- "Remind me to do ABC" (without a specific date)
- "Put 'clean garage' on the task box"

The task will appear on the Skylight display in the task box.`,
    {
      summary: z.string().describe("Task description"),
      emoji: z
        .string()
        .optional()
        .describe("Emoji icon for the task (e.g., '🧹', '📞')"),
      rewardPoints: z
        .number()
        .optional()
        .describe("Reward points for completing this task (for gamification)"),
      routine: z
        .boolean()
        .optional()
        .default(false)
        .describe("Is this a routine task?"),
    },
    async ({ summary, emoji, rewardPoints, routine }) => {
      try {
        const task = await createTaskBoxItem({
          summary,
          emojiIcon: emoji,
          rewardPoints,
          routine: routine ?? false,
        });

        const parts = [`Created task: "${task.attributes.summary}"`];

        if (task.attributes.emoji_icon) {
          parts.push(`Emoji: ${task.attributes.emoji_icon}`);
        }

        if (task.attributes.reward_points) {
          parts.push(`Reward points: ${task.attributes.reward_points}`);
        }

        parts.push(`\nThe task has been added to the Skylight task box.`);

        return {
          content: [
            {
              type: "text" as const,
              text: parts.join("\n"),
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

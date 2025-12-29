import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getChores, createChore, updateChore, deleteChore } from "../api/endpoints/chores.js";
import { findCategoryByName } from "../api/endpoints/categories.js";
import { getTodayDate, getDateOffset, parseDate, parseTime, formatDateForDisplay } from "../utils/dates.js";
import { formatErrorForMcp } from "../utils/errors.js";
import { getConfig } from "../config.js";

export function registerChoreTools(server: McpServer): void {
  // get_chores tool
  server.tool(
    "get_chores",
    `Get chores from Skylight.

Use this to answer:
- "What chores do I need to do today?"
- "Show me this week's chores"
- "What's on the chore chart?"
- "What chores does [name] have?"

Returns chores with their assignees, due dates, and completion status.`,
    {
      date: z
        .string()
        .optional()
        .describe("Start date (YYYY-MM-DD or 'today'). Defaults to today."),
      dateEnd: z
        .string()
        .optional()
        .describe("End date (YYYY-MM-DD). Defaults to 7 days from start."),
      includeLate: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include overdue chores from past dates"),
      assignee: z
        .string()
        .optional()
        .describe("Filter by family member name (e.g., 'Dad', 'Mom')"),
      status: z
        .enum(["pending", "completed", "all"])
        .optional()
        .default("pending")
        .describe("Filter by completion status"),
    },
    async ({ date, dateEnd, includeLate, assignee, status }) => {
      try {
        const config = getConfig();
        const startDate = date ? parseDate(date, config.timezone) : getTodayDate(config.timezone);
        const endDate = dateEnd ? parseDate(dateEnd, config.timezone) : getDateOffset(7, config.timezone);

        const result = await getChores({
          after: startDate,
          before: endDate,
          includeLate: includeLate ?? true,
        });

        let chores = result.chores;

        // Filter by status
        if (status !== "all") {
          chores = chores.filter((chore) => chore.attributes.status === status);
        }

        // Build category lookup for assignee names
        const categoryMap = new Map(result.categories.map((c) => [c.id, c.attributes.label ?? "Unknown"]));

        // Filter by assignee if specified
        if (assignee) {
          const lowerAssignee = assignee.toLowerCase();
          chores = chores.filter((chore) => {
            const categoryId = chore.relationships?.category?.data?.id;
            if (!categoryId) return false;
            const categoryName = categoryMap.get(categoryId)?.toLowerCase();
            return categoryName && categoryName.includes(lowerAssignee);
          });
        }

        if (chores.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No ${status === "all" ? "" : status + " "}chores found${assignee ? ` for ${assignee}` : ""}.`,
              },
            ],
          };
        }

        // Format chores for display
        const choreList = chores
          .map((chore) => {
            const attrs = chore.attributes;
            const categoryId = chore.relationships?.category?.data?.id;
            const assigneeName = categoryId ? categoryMap.get(categoryId) : null;

            const parts = [
              `- ${attrs.summary}`,
              `  Date: ${formatDateForDisplay(attrs.start)}${attrs.start_time ? ` at ${attrs.start_time}` : ""}`,
              `  Status: ${attrs.status}`,
            ];

            if (assigneeName) {
              parts.push(`  Assigned to: ${assigneeName}`);
            }

            if (attrs.recurring) {
              parts.push(`  Recurring: Yes${attrs.recurrence_set ? ` (${attrs.recurrence_set})` : ""}`);
            }

            if (attrs.reward_points) {
              parts.push(`  Reward points: ${attrs.reward_points}`);
            }

            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Chores:\n\n${choreList}`,
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

  // create_chore tool
  server.tool(
    "create_chore",
    `Add a new chore to Skylight.

Use this when the user wants to:
- Add a new task like "empty the dishwasher"
- Assign chores to family members
- Create recurring chores

The chore will appear on the Skylight display.`,
    {
      summary: z.string().describe("Chore description (e.g., 'Empty the dishwasher')"),
      date: z
        .string()
        .optional()
        .describe("Due date (YYYY-MM-DD or 'today', 'tomorrow', day name). Defaults to today."),
      time: z
        .string()
        .optional()
        .describe("Due time (e.g., '10:00 AM', '14:30'). Optional."),
      assignee: z
        .string()
        .optional()
        .describe("Family member to assign (e.g., 'Dad', 'Mom', 'Kids')"),
      recurring: z
        .boolean()
        .optional()
        .default(false)
        .describe("Is this a recurring chore?"),
      recurrencePattern: z
        .string()
        .optional()
        .describe("For recurring: 'daily', 'weekly', 'weekdays', or RRULE string"),
      rewardPoints: z
        .number()
        .optional()
        .describe("Reward points for completing this chore"),
    },
    async ({ summary, date, time, assignee, recurring, recurrencePattern, rewardPoints }) => {
      try {
        const config = getConfig();
        const choreDate = date ? parseDate(date, config.timezone) : getTodayDate(config.timezone);

        // Resolve assignee to category ID
        let categoryId: string | undefined;
        if (assignee) {
          const category = await findCategoryByName(assignee);
          if (category) {
            categoryId = category.id;
          } else {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Could not find a family member named "${assignee}". Use get_family_members to see available family members.`,
                },
              ],
              isError: true,
            };
          }
        }

        // Convert simple recurrence patterns to RRULE
        let recurrenceSet: string | undefined;
        if (recurring && recurrencePattern) {
          const pattern = recurrencePattern.toLowerCase();
          if (pattern === "daily") {
            recurrenceSet = "RRULE:FREQ=DAILY";
          } else if (pattern === "weekly") {
            recurrenceSet = "RRULE:FREQ=WEEKLY";
          } else if (pattern === "weekdays") {
            recurrenceSet = "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
          } else if (pattern.startsWith("RRULE:")) {
            recurrenceSet = pattern;
          } else {
            recurrenceSet = recurrencePattern;
          }
        }

        const chore = await createChore({
          summary,
          start: choreDate,
          startTime: time ? parseTime(time) : undefined,
          categoryId,
          recurring: recurring ?? false,
          recurrenceSet,
          rewardPoints,
        });

        const parts = [
          `Created chore: "${chore.attributes.summary}"`,
          `Date: ${formatDateForDisplay(chore.attributes.start)}${chore.attributes.start_time ? ` at ${chore.attributes.start_time}` : ""}`,
        ];

        if (assignee) {
          parts.push(`Assigned to: ${assignee}`);
        }

        if (chore.attributes.recurring) {
          parts.push(`Recurring: Yes`);
        }

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

  // update_chore tool
  server.tool(
    "update_chore",
    `Update an existing chore in Skylight.

Use this when:
- Marking a chore as complete: "Mark 'dishes' as done"
- Changing chore assignment: "Reassign the trash to Dad"
- Updating chore details: "Change the time for the homework chore"

Parameters:
- choreId (required): ID of the chore (from get_chores)
- summary: New description for the chore
- status: "completed" to mark done, "pending" to mark incomplete
- date: New due date
- time: New due time
- assignee: New family member assignment

Returns: The updated chore details.`,
    {
      choreId: z.string().describe("ID of the chore to update"),
      summary: z.string().optional().describe("New chore description"),
      status: z.enum(["pending", "completed"]).optional().describe("'completed' to mark done, 'pending' to mark incomplete"),
      date: z.string().optional().describe("New due date (YYYY-MM-DD or 'today', 'tomorrow')"),
      time: z.string().nullable().optional().describe("New due time (e.g., '10:00 AM', or null to clear)"),
      assignee: z.string().nullable().optional().describe("New family member assignment (or null to unassign)"),
      rewardPoints: z.number().nullable().optional().describe("New reward points (or null to clear)"),
    },
    async ({ choreId, summary, status, date, time, assignee, rewardPoints }) => {
      try {
        const config = getConfig();
        const updates: Parameters<typeof updateChore>[1] = {};

        if (summary !== undefined) updates.summary = summary;
        if (status !== undefined) updates.status = status;
        if (date !== undefined) updates.start = parseDate(date, config.timezone);
        if (time !== undefined) updates.startTime = time ? parseTime(time) : null;
        if (rewardPoints !== undefined) updates.rewardPoints = rewardPoints;

        // Handle assignee
        if (assignee !== undefined) {
          if (assignee === null) {
            updates.categoryId = null;
          } else {
            const category = await findCategoryByName(assignee);
            if (!category) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Could not find family member "${assignee}". Use get_family_members to see available members.`,
                  },
                ],
                isError: true,
              };
            }
            updates.categoryId = category.id;
          }
        }

        const chore = await updateChore(choreId, updates);
        const statusText = status === "completed" ? " (marked complete)" : status === "pending" ? " (marked pending)" : "";

        return {
          content: [
            {
              type: "text" as const,
              text: `Updated chore: "${chore.attributes.summary}"${statusText}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // delete_chore tool
  server.tool(
    "delete_chore",
    `Delete a chore from Skylight.

Use this when:
- Removing an old or irrelevant chore
- Deleting a chore that was added by mistake

Parameters:
- choreId (required): ID of the chore to delete (from get_chores)

Note: This permanently removes the chore. For recurring chores, this may only delete one instance.`,
    {
      choreId: z.string().describe("ID of the chore to delete"),
    },
    async ({ choreId }) => {
      try {
        await deleteChore(choreId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Deleted chore (ID: ${choreId})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );
}

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

Returns chores with their IDs (needed for update_chore/delete_chore), assignees,
due dates, and completion status.`,
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
              `  ID: ${chore.id}`,
              `  Date: ${formatDateForDisplay(attrs.start)}${attrs.start_time ? ` at ${attrs.start_time}` : ""}`,
              `  Status: ${attrs.status}`,
            ];

            if (assigneeName) {
              parts.push(`  Assigned to: ${assigneeName}`);
            }

            if (attrs.recurring) {
              parts.push(`  Recurring: Yes${attrs.recurrence_set ? ` (${attrs.recurrence_set})` : ""}`);

              if (attrs.recurring_until) {
                const todayStr = getTodayDate(config.timezone);
                const daysRemaining = Math.round(
                  (new Date(attrs.recurring_until + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) /
                    86400000
                );
                const untilLine = `  Recurring until: ${formatDateForDisplay(attrs.recurring_until)}`;
                if (daysRemaining <= 14) {
                  parts.push(
                    `${untilLine} — WARNING: stops recurring in ${daysRemaining <= 0 ? "0 or fewer" : daysRemaining} day(s); no further occurrences will be created after that date unless extended`
                  );
                } else {
                  parts.push(untilLine);
                }
              }
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
              text: formatErrorForMcp(error),
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

The chore will appear on the Skylight display. An assignee is required —
this account's Skylight API version rejects unassigned ("up for grabs")
chores outright, so there is no way to create one without an assignee.`,
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
        .describe("Family member to assign (e.g., 'Dad', 'Mom', 'Kids'). Required — see get_family_members."),
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

        // Resolve assignee to category ID (required — see createChore's docstring)
        const category = await findCategoryByName(assignee);
        if (!category) {
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
        const categoryId = category.id;

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
          `Created chore: "${chore.attributes.summary}" (ID: ${chore.id})`,
          `Date: ${formatDateForDisplay(chore.attributes.start)}${chore.attributes.start_time ? ` at ${chore.attributes.start_time}` : ""}`,
          `Assigned to: ${assignee}`,
        ];

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
              text: formatErrorForMcp(error),
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
- Shifting which day(s) a recurring chore falls on: "Move trash day to Wednesday"

Parameters:
- choreId (required): ID of the chore (from get_chores)
- summary: New description for the chore
- status: "completed" to mark done, "pending" to mark incomplete
- date: New due date. IMPORTANT: for a recurring chore, changing date alone does NOT
  shift which day(s) it recurs on — the API keeps generating occurrences on the old
  RRULE weekday regardless of the new date. To actually move a recurring chore's day,
  also pass recurrencePattern with a matching RRULE (e.g. date="2026-08-26" +
  recurrencePattern="RRULE:FREQ=WEEKLY;BYDAY=WE" to move it to Wednesdays), and pass
  applyTo.
- recurrencePattern: New recurrence rule for a recurring chore ('daily', 'weekly',
  'weekdays', or a raw RRULE string like 'RRULE:FREQ=WEEKLY;BYDAY=WE'). Use this to
  actually change a recurring chore's day(s) — date alone won't do it.
- applyTo: Required for any change to a recurring chore, or the API silently ignores
  the whole update (200 response, nothing actually changes, no error). Not needed for
  one-off chores.
  - "all": apply to every occurrence of the series
  - "future": apply to this occurrence and every later one, past occurrences untouched
- time: New due time
- assignee: New family member assignment. There is no way to unassign a chore on this
  account (up_for_grabs is rejected by the API) — assignee can only be reassigned to
  another family member, never cleared.

Returns: The updated chore details. If any requested field didn't actually change
(most commonly: a recurring chore updated without applyTo), this returns an error
instead of a false "Updated" success, listing exactly which fields didn't take.`,
    {
      choreId: z.string().describe("ID of the chore to update"),
      summary: z.string().optional().describe("New chore description"),
      status: z.enum(["pending", "completed"]).optional().describe("'completed' to mark done, 'pending' to mark incomplete"),
      date: z.string().optional().describe("New due date (YYYY-MM-DD or 'today', 'tomorrow')"),
      recurrencePattern: z
        .string()
        .optional()
        .describe(
          "New recurrence rule to actually shift a recurring chore's day(s): 'daily', 'weekly', 'weekdays', or an RRULE string (e.g. 'RRULE:FREQ=WEEKLY;BYDAY=WE'). Changing date alone does not move the recurrence day."
        ),
      applyTo: z
        .enum(["all", "future"])
        .optional()
        .describe(
          "Required for any update to a recurring chore, or the change is silently ignored. 'all' = whole series, 'future' = this occurrence onward."
        ),
      time: z.string().nullable().optional().describe("New due time (e.g., '10:00 AM', or null to clear)"),
      assignee: z.string().optional().describe("New family member to reassign to. Unassigning is not supported."),
      rewardPoints: z.number().nullable().optional().describe("New reward points (or null to clear)"),
    },
    async ({ choreId, summary, status, date, recurrencePattern, applyTo, time, assignee, rewardPoints }) => {
      try {
        const config = getConfig();
        const updates: Parameters<typeof updateChore>[1] = {};

        if (summary !== undefined) updates.summary = summary;
        if (status !== undefined) updates.status = status;
        if (date !== undefined) updates.start = parseDate(date, config.timezone);
        if (time !== undefined) updates.startTime = time ? parseTime(time) : null;
        if (rewardPoints !== undefined) updates.rewardPoints = rewardPoints;
        if (applyTo !== undefined) updates.applyTo = applyTo;

        // Convert simple recurrence patterns to RRULE (same mapping as create_chore)
        let expectedRecurrenceSet: string | undefined;
        if (recurrencePattern !== undefined) {
          const pattern = recurrencePattern.toLowerCase();
          if (pattern === "daily") {
            expectedRecurrenceSet = "RRULE:FREQ=DAILY";
          } else if (pattern === "weekly") {
            expectedRecurrenceSet = "RRULE:FREQ=WEEKLY";
          } else if (pattern === "weekdays") {
            expectedRecurrenceSet = "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
          } else if (pattern.startsWith("rrule:")) {
            expectedRecurrenceSet = recurrencePattern;
          } else {
            expectedRecurrenceSet = recurrencePattern;
          }
          updates.recurrenceSet = expectedRecurrenceSet;
        }

        // Handle assignee (reassign only — unassigning is not supported by this API)
        let expectedCategoryId: string | undefined;
        if (assignee !== undefined) {
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
          expectedCategoryId = category.id;
        }

        const chore = await updateChore(choreId, updates);

        // Verify the fields we asked to change actually changed. The API returns
        // 200 and echoes the *unchanged* chore when a recurring chore is updated
        // without applyTo, rather than erroring — so a successful HTTP response
        // does not mean the update took effect. Catch that here instead of
        // reporting a false success.
        const unchanged: string[] = [];
        if (summary !== undefined && chore.attributes.summary !== summary) unchanged.push("summary");
        if (status !== undefined && chore.attributes.status !== status) unchanged.push("status");
        if (updates.start !== undefined && chore.attributes.start !== updates.start) unchanged.push("date");
        if (
          expectedRecurrenceSet !== undefined &&
          !(chore.attributes.recurrence_set ?? []).includes(expectedRecurrenceSet)
        ) {
          unchanged.push("recurrencePattern");
        }
        if (expectedCategoryId !== undefined && chore.relationships?.category?.data?.id !== expectedCategoryId) {
          unchanged.push("assignee");
        }

        // Special case: changing `date` on a recurring chore without also changing
        // recurrencePattern. The API happily writes the new `start` attribute (so the
        // check above sees a "match" and would otherwise call this a success) while
        // leaving the actual RRULE/BYDAY — and therefore every future occurrence date —
        // on the old day of week. Confirmed by direct testing: this produces an
        // internally inconsistent chore (start says one weekday, generated occurrences
        // follow another) with no error from the API. Since attrs.recurring reliably
        // reflects true state even when other fields don't, use it as an unconditional
        // guard rather than trusting the start-field comparison alone.
        let recurrenceDayWarning: string | undefined;
        if (date !== undefined && recurrencePattern === undefined && chore.attributes.recurring) {
          recurrenceDayWarning =
            "date: the date attribute was written, but this chore is recurring, so its actual occurrence days did not move — pass recurrencePattern together with date to shift a recurring chore's day.";
        }

        if (unchanged.length > 0 || recurrenceDayWarning) {
          const parts = [];
          if (unchanged.length > 0) {
            parts.push(
              `Update did not take effect for: ${unchanged.join(", ")}. This chore is likely recurring — pass applyTo ("all" or "future") to change it.`
            );
          }
          if (recurrenceDayWarning) {
            parts.push(recurrenceDayWarning);
          }
          parts.push('No error was returned by Skylight, but the field(s) above did not actually change.');

          return {
            content: [{ type: "text" as const, text: parts.join(" ") }],
            isError: true,
          };
        }

        const statusText = status === "completed" ? " (marked complete)" : status === "pending" ? " (marked pending)" : "";

        return {
          content: [
            {
              type: "text" as const,
              text: `Updated chore: "${chore.attributes.summary}" (ID: ${chore.id})${statusText}`,
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

  // delete_chore tool
  server.tool(
    "delete_chore",
    `Delete a chore from Skylight.

Use this when:
- Removing an old or irrelevant chore
- Deleting a chore that was added by mistake
- Removing a recurring chore series, or ending it from a given date onward

Parameters:
- choreId (required): ID of the chore to delete (from get_chores)
- applyTo: Required for recurring chores, ignored for one-off chores.
  - "all": delete every occurrence of the recurring series
  - "future": delete this occurrence and every later one, keeping past occurrences intact
  There is no way to delete a single recurring occurrence while leaving later ones in place —
  the Skylight API only supports "all" or "future" for recurring chores.

Note: This permanently removes the chore(s). Deleting a recurring chore without applyTo will
fail with an error asking for one.`,
    {
      choreId: z.string().describe("ID of the chore to delete"),
      applyTo: z
        .enum(["all", "future"])
        .optional()
        .describe(
          "Required for recurring chores: 'all' deletes the whole series, 'future' deletes this occurrence onward. Not needed for one-off chores."
        ),
    },
    async ({ choreId, applyTo }) => {
      try {
        await deleteChore(choreId, applyTo);
        return {
          content: [
            {
              type: "text" as const,
              text: `Deleted chore (ID: ${choreId}${applyTo ? `, applyTo: ${applyTo}` : ""})`,
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

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getCalendarEvents, getSourceCalendars } from "../api/endpoints/calendar.js";
import { getTodayDate, parseDate, formatDateForDisplay } from "../utils/dates.js";
import { formatErrorForMcp } from "../utils/errors.js";
import { getConfig } from "../config.js";

export function registerCalendarTools(server: McpServer): void {
  // get_calendar_events tool
  server.tool(
    "get_calendar_events",
    `Get calendar events from Skylight.

Use this to answer questions like:
- "What's on my calendar today?"
- "What do we have scheduled this weekend?"
- "Are there any events on Friday?"

Returns a list of events with their titles, times, and details.`,
    {
      date: z
        .string()
        .optional()
        .describe("Start date (YYYY-MM-DD or 'today', 'tomorrow', day name). Defaults to today."),
      dateEnd: z
        .string()
        .optional()
        .describe("End date (YYYY-MM-DD). Defaults to same as start date."),
    },
    async ({ date, dateEnd }) => {
      try {
        const config = getConfig();
        const startDate = date ? parseDate(date, config.timezone) : getTodayDate(config.timezone);
        const endDate = dateEnd ? parseDate(dateEnd, config.timezone) : startDate;

        const events = await getCalendarEvents({
          dateMin: startDate,
          dateMax: endDate,
          timezone: config.timezone,
        });

        if (events.length === 0) {
          const dateRange =
            startDate === endDate
              ? formatDateForDisplay(startDate)
              : `${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`;
          return {
            content: [
              {
                type: "text" as const,
                text: `No calendar events found for ${dateRange}.`,
              },
            ],
          };
        }

        // Format events for display
        const eventList = events
          .map((event) => {
            const attrs = event.attributes;
            const parts: string[] = [];

            // Add all available attributes
            for (const [key, value] of Object.entries(attrs)) {
              if (value !== null && value !== undefined) {
                parts.push(`  ${key}: ${value}`);
              }
            }

            return `- Event (ID: ${event.id})\n${parts.join("\n")}`;
          })
          .join("\n\n");

        const dateRange =
          startDate === endDate
            ? formatDateForDisplay(startDate)
            : `${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`;

        return {
          content: [
            {
              type: "text" as const,
              text: `Calendar events for ${dateRange}:\n\n${eventList}`,
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

  // get_source_calendars tool
  server.tool(
    "get_source_calendars",
    `Get connected calendar sources synced to Skylight.

Use this to answer:
- "Which calendars are synced to Skylight?"
- "What calendar accounts are connected?"

Returns a list of connected calendar sources (Google, iCloud, etc.).`,
    {},
    async () => {
      try {
        const calendars = await getSourceCalendars();

        if (calendars.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No calendar sources are connected to Skylight.",
              },
            ],
          };
        }

        const calendarList = calendars
          .map((cal) => {
            const attrs = cal.attributes;
            const parts: string[] = [`- Calendar (ID: ${cal.id})`];

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
              text: `Connected calendar sources:\n\n${calendarList}`,
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

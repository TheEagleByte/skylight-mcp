import { getClient } from "../client.js";
import type {
  CalendarEventsResponse,
  CalendarEventResource,
  SourceCalendarsResponse,
  SourceCalendarResource,
} from "../types.js";

export interface GetCalendarEventsOptions {
  dateMin: string;
  dateMax: string;
  timezone?: string;
  include?: string;
}

/**
 * Get calendar events for a date range
 */
export async function getCalendarEvents(
  options: GetCalendarEventsOptions
): Promise<CalendarEventResource[]> {
  const client = getClient();
  const response = await client.get<CalendarEventsResponse>(
    "/api/frames/{frameId}/calendar_events",
    {
      date_min: options.dateMin,
      date_max: options.dateMax,
      timezone: options.timezone ?? client.timezone,
      include: options.include,
    }
  );
  return response.data;
}

/**
 * Get source calendars (connected calendar accounts)
 */
export async function getSourceCalendars(): Promise<SourceCalendarResource[]> {
  const client = getClient();
  const response = await client.get<SourceCalendarsResponse>(
    "/api/frames/{frameId}/source_calendars"
  );
  return response.data;
}

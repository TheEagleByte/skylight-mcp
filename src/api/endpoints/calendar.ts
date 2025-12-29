import { getClient } from "../client.js";
import type {
  CalendarEventsResponse,
  CalendarEventResource,
  CalendarEventResponse,
  SourceCalendarsResponse,
  SourceCalendarResource,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
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

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  data: CreateCalendarEventRequest
): Promise<CalendarEventResource> {
  const client = getClient();
  const response = await client.post<CalendarEventResponse>(
    "/api/frames/{frameId}/calendar_events",
    data
  );
  return response.data;
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  data: UpdateCalendarEventRequest
): Promise<CalendarEventResource> {
  const client = getClient();
  const response = await client.request<CalendarEventResponse>(
    `/api/frames/{frameId}/calendar_events/${eventId}`,
    { method: "PUT", body: data }
  );
  return response.data;
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const client = getClient();
  await client.request(`/api/frames/{frameId}/calendar_events/${eventId}`, {
    method: "DELETE",
  });
}

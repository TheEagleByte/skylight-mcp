import { describe, it, expect } from "vitest";
import type { CreateCalendarEventRequest, UpdateCalendarEventRequest } from "../src/api/types.js";

describe("calendar", () => {
  describe("CreateCalendarEventRequest type", () => {
    it("supports calendarId and calendarAccountId for Google Calendar sync", () => {
      const request: CreateCalendarEventRequest = {
        summary: "test event",
        starts_at: "2026-01-23T02:00:00.000Z",
        ends_at: "2026-01-23T03:00:00.000Z",
        all_day: false,
        calendar_account_id: "123456",
        calendar_id: "test_calendar_id@group.calendar.google.com",
        timezone: "America/Los_Angeles",
        countdown_enabled: false,
        kind: "standard",
      };

      expect(request.calendar_id).toBe("test_calendar_id@group.calendar.google.com");
      expect(request.calendar_account_id).toBe("123456");
      expect(request.timezone).toBe("America/Los_Angeles");
      expect(request.countdown_enabled).toBe(false);
      expect(request.kind).toBe("standard");
    });

    it("supports rrule for recurring events", () => {
      const request: CreateCalendarEventRequest = {
        summary: "Weekly meeting",
        starts_at: "2026-01-23T10:00:00.000Z",
        ends_at: "2026-01-23T11:00:00.000Z",
        rrule: ["FREQ=WEEKLY;BYDAY=MO,WE,FR"],
      };

      expect(request.rrule).toEqual(["FREQ=WEEKLY;BYDAY=MO,WE,FR"]);
    });

    it("allows null rrule for non-recurring events", () => {
      const request: CreateCalendarEventRequest = {
        summary: "One-time event",
        starts_at: "2026-01-23T10:00:00.000Z",
        ends_at: "2026-01-23T11:00:00.000Z",
        rrule: null,
      };

      expect(request.rrule).toBeNull();
    });

    it("supports all optional parameters together", () => {
      const request: CreateCalendarEventRequest = {
        summary: "Full event",
        starts_at: "2026-01-23T02:00:00.000Z",
        ends_at: "2026-01-23T03:00:00.000Z",
        all_day: false,
        description: "Event description",
        location: "123 Test Street",
        category_ids: ["cat-001"],
        calendar_account_id: "acct-123",
        calendar_id: "my-calendar@group.calendar.google.com",
        timezone: "America/Los_Angeles",
        rrule: null,
        countdown_enabled: true,
        kind: "standard",
      };

      expect(request.summary).toBe("Full event");
      expect(request.description).toBe("Event description");
      expect(request.location).toBe("123 Test Street");
      expect(request.category_ids).toEqual(["cat-001"]);
      expect(request.calendar_account_id).toBe("acct-123");
      expect(request.calendar_id).toBe("my-calendar@group.calendar.google.com");
      expect(request.timezone).toBe("America/Los_Angeles");
      expect(request.countdown_enabled).toBe(true);
      expect(request.kind).toBe("standard");
    });
  });

  describe("UpdateCalendarEventRequest type", () => {
    it("supports calendarId and calendarAccountId for changing sync target", () => {
      const request: UpdateCalendarEventRequest = {
        calendar_account_id: "acct-456",
        calendar_id: "other-calendar@group.calendar.google.com",
      };

      expect(request.calendar_id).toBe("other-calendar@group.calendar.google.com");
      expect(request.calendar_account_id).toBe("acct-456");
    });

    it("supports updating timezone", () => {
      const request: UpdateCalendarEventRequest = {
        timezone: "America/New_York",
      };

      expect(request.timezone).toBe("America/New_York");
    });

    it("supports updating rrule", () => {
      const request: UpdateCalendarEventRequest = {
        rrule: ["FREQ=DAILY"],
      };

      expect(request.rrule).toEqual(["FREQ=DAILY"]);
    });

    it("supports updating countdown_enabled", () => {
      const request: UpdateCalendarEventRequest = {
        countdown_enabled: true,
      };

      expect(request.countdown_enabled).toBe(true);
    });

    it("supports updating kind", () => {
      const request: UpdateCalendarEventRequest = {
        kind: "birthday",
      };

      expect(request.kind).toBe("birthday");
    });

    it("supports updating all new parameters together", () => {
      const request: UpdateCalendarEventRequest = {
        summary: "Updated event",
        starts_at: "2026-01-24T10:00:00.000Z",
        ends_at: "2026-01-24T11:00:00.000Z",
        calendar_account_id: "acct-789",
        calendar_id: "new-calendar@group.calendar.google.com",
        timezone: "Europe/London",
        rrule: ["FREQ=MONTHLY"],
        countdown_enabled: false,
        kind: "standard",
      };

      expect(request.summary).toBe("Updated event");
      expect(request.calendar_account_id).toBe("acct-789");
      expect(request.calendar_id).toBe("new-calendar@group.calendar.google.com");
      expect(request.timezone).toBe("Europe/London");
      expect(request.rrule).toEqual(["FREQ=MONTHLY"]);
      expect(request.countdown_enabled).toBe(false);
      expect(request.kind).toBe("standard");
    });
  });

  describe("calendar sync parameters", () => {
    it("matches webapp request format for synced events", () => {
      // This test verifies the request structure matches what the webapp sends
      const webappRequest = {
        summary: "test",
        kind: "standard",
        category_ids: ["cat-001"],
        starts_at: "2026-01-23T02:00:00.000Z",
        ends_at: "2026-01-23T03:00:00.000Z",
        all_day: false,
        rrule: null,
        invited_emails: [],
        location: "",
        description: "testing",
        calendar_account_id: "acct-123",
        calendar_id: "test-calendar@group.calendar.google.com",
        timezone: "America/Los_Angeles",
        countdown_enabled: false,
      };

      // Our CreateCalendarEventRequest should be able to represent this
      const request: CreateCalendarEventRequest = {
        summary: webappRequest.summary,
        kind: webappRequest.kind,
        category_ids: webappRequest.category_ids,
        starts_at: webappRequest.starts_at,
        ends_at: webappRequest.ends_at,
        all_day: webappRequest.all_day,
        rrule: webappRequest.rrule,
        location: webappRequest.location,
        description: webappRequest.description,
        calendar_account_id: webappRequest.calendar_account_id,
        calendar_id: webappRequest.calendar_id,
        timezone: webappRequest.timezone,
        countdown_enabled: webappRequest.countdown_enabled,
      };

      expect(request.calendar_id).toBe(webappRequest.calendar_id);
      expect(request.calendar_account_id).toBe(webappRequest.calendar_account_id);
      expect(request.timezone).toBe(webappRequest.timezone);
      expect(request.kind).toBe(webappRequest.kind);
      expect(request.countdown_enabled).toBe(webappRequest.countdown_enabled);
    });
  });
});

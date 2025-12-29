import { describe, it, expect } from "vitest";
import {
  SkylightError,
  AuthenticationError,
  ConfigurationError,
  NotFoundError,
  RateLimitError,
  ParseError,
  formatErrorForMcp,
} from "../src/utils/errors.js";

describe("errors", () => {
  describe("SkylightError", () => {
    it("creates error with all properties", () => {
      const error = new SkylightError("test message", "TEST_CODE", 500, true);
      expect(error.message).toBe("test message");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe("SkylightError");
    });

    it("defaults recoverable to false", () => {
      const error = new SkylightError("test", "TEST");
      expect(error.recoverable).toBe(false);
    });
  });

  describe("AuthenticationError", () => {
    it("creates error with default message", () => {
      const error = new AuthenticationError();
      expect(error.message).toContain("Authentication failed");
      expect(error.code).toBe("AUTH_FAILED");
      expect(error.statusCode).toBe(401);
      expect(error.recoverable).toBe(true);
    });

    it("accepts custom message", () => {
      const error = new AuthenticationError("Custom auth error");
      expect(error.message).toBe("Custom auth error");
    });
  });

  describe("NotFoundError", () => {
    it("creates error with resource name", () => {
      const error = new NotFoundError("Chore");
      expect(error.message).toBe("Chore not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("RateLimitError", () => {
    it("creates error without retry time", () => {
      const error = new RateLimitError();
      expect(error.message).toContain("Rate limited");
      expect(error.message).toContain("try again");
    });

    it("creates error with retry time", () => {
      const error = new RateLimitError(30);
      expect(error.message).toContain("Retry after 30s");
    });
  });

  describe("formatErrorForMcp", () => {
    it("formats AuthenticationError with guidance", () => {
      const error = new AuthenticationError();
      const result = formatErrorForMcp(error);
      expect(result).toContain("Authentication Error");
      expect(result).toContain("token may have expired");
    });

    it("formats NotFoundError with guidance", () => {
      const error = new NotFoundError("Resource");
      const result = formatErrorForMcp(error);
      expect(result).toContain("Not Found");
      expect(result).toContain("doesn't exist");
    });

    it("formats RateLimitError with guidance", () => {
      const error = new RateLimitError();
      const result = formatErrorForMcp(error);
      expect(result).toContain("Rate Limited");
      expect(result).toContain("wait");
    });

    it("formats ConfigurationError with guidance", () => {
      const error = new ConfigurationError("Missing SKYLIGHT_TOKEN");
      const result = formatErrorForMcp(error);
      expect(result).toContain("Configuration Error");
      expect(result).toContain("environment variables");
    });

    it("formats generic SkylightError", () => {
      const error = new SkylightError("Something went wrong", "UNKNOWN");
      const result = formatErrorForMcp(error);
      expect(result).toContain("Skylight Error");
      expect(result).toContain("Something went wrong");
    });

    it("formats standard Error", () => {
      const error = new Error("Generic error");
      const result = formatErrorForMcp(error);
      expect(result).toBe("Error: Generic error");
    });

    it("handles non-Error values", () => {
      expect(formatErrorForMcp("string error")).toBe("Error: string error");
      expect(formatErrorForMcp(42)).toBe("Error: 42");
      expect(formatErrorForMcp(null)).toBe("Error: null");
      expect(formatErrorForMcp(undefined)).toBe("Error: undefined");
      expect(formatErrorForMcp({ custom: "object" })).toBe("Error: [object Object]");
    });
  });
});

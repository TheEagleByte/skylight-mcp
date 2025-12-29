/**
 * Base error class for Skylight API errors
 */
export class SkylightError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = "SkylightError";
  }
}

/**
 * Authentication failed - token may be expired or invalid
 */
export class AuthenticationError extends SkylightError {
  constructor(message: string = "Authentication failed. Your token may be expired or invalid.") {
    super(message, "AUTH_FAILED", 401, true);
    this.name = "AuthenticationError";
  }
}

/**
 * Configuration error - missing or invalid settings
 */
export class ConfigurationError extends SkylightError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR", undefined, true);
    this.name = "ConfigurationError";
  }
}

/**
 * Resource not found
 */
export class NotFoundError extends SkylightError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404, false);
    this.name = "NotFoundError";
  }
}

/**
 * Rate limited by the API
 */
export class RateLimitError extends SkylightError {
  constructor(retryAfter?: number) {
    super(
      `Rate limited by Skylight API. ${retryAfter ? `Retry after ${retryAfter}s` : "Please wait and try again."}`,
      "RATE_LIMITED",
      429,
      true
    );
    this.name = "RateLimitError";
  }
}

/**
 * API returned an unexpected response format
 */
export class ParseError extends SkylightError {
  constructor(message: string = "Unexpected API response format") {
    super(message, "PARSE_ERROR", undefined, false);
    this.name = "ParseError";
  }
}

/**
 * Format an error for MCP tool response
 * Accepts unknown to handle any value from catch blocks safely
 */
export function formatErrorForMcp(error: unknown): string {
  if (error instanceof AuthenticationError) {
    return `Authentication Error: ${error.message}

Your Skylight token may have expired. To fix this:
1. Open the Skylight app on your device
2. Capture fresh API traffic using a proxy tool
3. Update your SKYLIGHT_TOKEN environment variable

See the auth documentation for detailed steps.`;
  }

  if (error instanceof NotFoundError) {
    return `Not Found: ${error.message}

This could mean:
- The requested item doesn't exist
- Your frame ID is incorrect
- The item was deleted from Skylight`;
  }

  if (error instanceof RateLimitError) {
    return `Rate Limited: ${error.message}

The Skylight API is temporarily limiting requests. Please wait a moment and try again.`;
  }

  if (error instanceof ConfigurationError) {
    return `Configuration Error: ${error.message}

Please check your environment variables are set correctly.`;
  }

  if (error instanceof SkylightError) {
    return `Skylight Error: ${error.message}`;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Error: ${String(error)}`;
}

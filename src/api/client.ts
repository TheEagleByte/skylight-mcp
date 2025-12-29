import { getConfig, type Config } from "../config.js";
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  SkylightError,
} from "../utils/errors.js";

const BASE_URL = "https://app.ourskylight.com";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | boolean | number | undefined>;
  body?: unknown;
}

/**
 * Skylight API Client
 * Handles authentication and HTTP requests to the Skylight API
 */
export class SkylightClient {
  private config: Config;

  constructor(config?: Config) {
    this.config = config ?? getConfig();
  }

  /**
   * Build the Authorization header based on auth type
   */
  private getAuthHeader(): string {
    const { token, authType } = this.config;
    if (authType === "basic") {
      return `Basic ${token}`;
    }
    return `Bearer ${token}`;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | boolean | number | undefined>): string {
    const url = new URL(endpoint, BASE_URL);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Handle API response errors
   */
  private async handleResponseError(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401) {
      throw new AuthenticationError();
    }

    if (status === 404) {
      throw new NotFoundError("Resource");
    }

    if (status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
    }

    // Try to get error details from response
    let errorMessage = `HTTP ${status}`;
    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage += `: ${errorBody.slice(0, 200)}`;
      }
    } catch {
      // Ignore parse errors
    }

    throw new SkylightError(errorMessage, "HTTP_ERROR", status, status >= 500);
  }

  /**
   * Make an authenticated request to the Skylight API
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", params, body } = options;

    // Replace {frameId} placeholder with actual frame ID
    const resolvedEndpoint = endpoint.replace("{frameId}", this.config.frameId);
    const url = this.buildUrl(resolvedEndpoint, params);

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      Accept: "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    // Handle 304 Not Modified
    if (response.status === 304) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string, params?: Record<string, string | boolean | number | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  /**
   * POST request helper
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  /**
   * Get the frame ID from config
   */
  get frameId(): string {
    return this.config.frameId;
  }

  /**
   * Get the timezone from config
   */
  get timezone(): string {
    return this.config.timezone;
  }
}

// Singleton instance
let clientInstance: SkylightClient | null = null;

export function getClient(): SkylightClient {
  if (!clientInstance) {
    clientInstance = new SkylightClient();
  }
  return clientInstance;
}

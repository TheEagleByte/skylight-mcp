import { afterEach, describe, expect, it, vi } from "vitest";

import { login } from "../src/api/auth.js";

function textResponse(status: number, body: string, headers: HeadersInit = {}): Response {
  return new Response(body, {
    status,
    headers,
  });
}

function jsonResponse(status: number, body: unknown, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json");

  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

describe("auth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("completes the OAuth login flow and returns a bearer token", async () => {
    let capturedState = "";
    let capturedCodeVerifier = "";

    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith("https://app.ourskylight.com/oauth/authorize?") && url.includes("prompt=login")) {
        const params = new URL(url).searchParams;
        capturedState = params.get("state") ?? "";
        return textResponse(302, "", {
          location: "https://app.ourskylight.com/auth/session/new",
          "set-cookie":
            "_skylight_cloud_session=abc123; path=/; secure; httponly, skylight_notice=dismissed; Expires=Wed, 15 Apr 2026 00:00:00 GMT; Path=/; Secure",
        });
      }

      if (url === "https://app.ourskylight.com/auth/session/new") {
        const headers = new Headers(init?.headers);
        expect(headers.get("cookie")).toContain("_skylight_cloud_session=abc123");
        expect(headers.get("cookie")).toContain("skylight_notice=dismissed");
        return textResponse(
          200,
          '<form><input type="hidden" name="authenticity_token" value="form-token-123" /></form>'
        );
      }

      if (url === "https://app.ourskylight.com/auth/session") {
        const headers = new Headers(init?.headers);
        expect(headers.get("cookie")).toContain("_skylight_cloud_session=abc123");
        expect(headers.get("cookie")).toContain("skylight_notice=dismissed");
        const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams(String(init?.body ?? ""));
        expect(body.get("authenticity_token")).toBe("form-token-123");
        expect(body.get("email")).toBe("user@example.com");
        expect(body.get("password")).toBe("secret");

        return textResponse(302, "", {
          location: "https://app.ourskylight.com/oauth/authorize?client_id=skylight-mobile",
        });
      }

      if (url === "https://app.ourskylight.com/oauth/authorize?client_id=skylight-mobile") {
        return textResponse(302, "", {
          location: `https://ourskylight.com/welcome?code=oauth-code-123&state=${capturedState}`,
        });
      }

      if (url === "https://app.ourskylight.com/oauth/token") {
        const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams(String(init?.body ?? ""));
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("client_id")).toBe("skylight-mobile");
        expect(body.get("scope")).toBe("everything");
        expect(body.get("code")).toBe("oauth-code-123");
        capturedCodeVerifier = body.get("code_verifier") ?? "";
        expect(capturedCodeVerifier.length).toBeGreaterThan(20);

        return jsonResponse(200, {
          access_token: "bearer-token-123",
          token_type: "Bearer",
        });
      }

      if (url === "https://app.ourskylight.com/api/plus_access") {
        expect(init?.headers).toBeDefined();
        const headers = new Headers(init?.headers);
        expect(headers.get("authorization")).toBe("Bearer bearer-token-123");
        expect(headers.get("skylight-api-version")).toBe("2026-03-01");
        return textResponse(200, "");
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await login("user@example.com", "secret");

    expect(result).toEqual({
      email: "user@example.com",
      token: "bearer-token-123",
      subscriptionStatus: "plus",
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("throws a helpful error for invalid credentials", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith("https://app.ourskylight.com/oauth/authorize?") && url.includes("prompt=login")) {
        return textResponse(302, "", {
          location: "https://app.ourskylight.com/auth/session/new",
        });
      }

      if (url === "https://app.ourskylight.com/auth/session/new") {
        return textResponse(
          200,
          '<form><input type="hidden" name="authenticity_token" value="form-token-123" /></form>'
        );
      }

      if (url === "https://app.ourskylight.com/auth/session") {
        return textResponse(422, "invalid credentials");
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(login("user@example.com", "wrong-password")).rejects.toThrow(
      "Invalid email or password"
    );
  });
});

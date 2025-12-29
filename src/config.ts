import { z } from "zod";

const ConfigSchema = z.object({
  token: z.string().min(1, "SKYLIGHT_TOKEN is required"),
  frameId: z.string().min(1, "SKYLIGHT_FRAME_ID is required"),
  authType: z.enum(["bearer", "basic"]).default("bearer"),
  timezone: z.string().default("America/New_York"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse({
    token: process.env.SKYLIGHT_TOKEN,
    frameId: process.env.SKYLIGHT_FRAME_ID,
    authType: process.env.SKYLIGHT_AUTH_TYPE || "bearer",
    timezone: process.env.SKYLIGHT_TIMEZONE || "America/New_York",
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  - ${e.message}`).join("\n");
    console.error(`
Skylight MCP Server - Configuration Error

Missing or invalid configuration:
${errors}

To configure the server, set these environment variables:
  SKYLIGHT_TOKEN    - Your Skylight API token (required)
  SKYLIGHT_FRAME_ID - Your frame/household ID (required)
  SKYLIGHT_AUTH_TYPE - 'bearer' or 'basic' (optional, default: bearer)
  SKYLIGHT_TIMEZONE  - Timezone for dates (optional, default: America/New_York)

To obtain your token and frame ID:
1. Install a proxy tool (Proxyman, Charles, mitmproxy)
2. Capture traffic from the Skylight mobile app
3. Find the Authorization header and frame ID from API calls

See: https://github.com/yourrepo/skylight-api/blob/main/docs/auth.md
`);
    process.exit(1);
  }

  return result.data;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

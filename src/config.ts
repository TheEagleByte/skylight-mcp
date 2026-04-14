import { z } from "zod";

// Config schema supports two auth methods:
// 1. Email/password (preferred) - replays the Skylight web OAuth flow automatically
// 2. Token-based (legacy/manual) - for captured bearer/basic tokens
const ConfigSchema = z
  .object({
    // Email/password auth (preferred)
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),

    // Token-based auth (legacy)
    token: z.string().min(1).optional(),
    authType: z.enum(["bearer", "basic"]).default("bearer"),

    // Required
    frameId: z.string().min(1, "SKYLIGHT_FRAME_ID is required"),

    // Optional
    timezone: z.string().default("America/New_York"),
  })
  .refine(
    (data) => {
      // Must have either email+password OR token
      const hasEmailAuth = data.email && data.password;
      const hasTokenAuth = !!data.token;
      return hasEmailAuth || hasTokenAuth;
    },
    {
      message: "Either SKYLIGHT_EMAIL and SKYLIGHT_PASSWORD, or SKYLIGHT_TOKEN must be provided",
    }
  );

export type Config = z.infer<typeof ConfigSchema>;

export interface ResolvedConfig {
  token: string;
  frameId: string;
  timezone: string;
  authType: "bearer" | "basic";
}

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse({
    email: process.env.SKYLIGHT_EMAIL,
    password: process.env.SKYLIGHT_PASSWORD,
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

Authentication (choose one):
  Option 1 - Email/Password (recommended):
    SKYLIGHT_EMAIL    - Your Skylight account email
    SKYLIGHT_PASSWORD - Your Skylight account password

  Option 2 - Manual Token:
    SKYLIGHT_TOKEN    - Your Skylight API token
    SKYLIGHT_AUTH_TYPE - 'bearer' or 'basic' (default: bearer)

Required:
  SKYLIGHT_FRAME_ID - Your frame/household ID

Optional:
  SKYLIGHT_TIMEZONE - Timezone for dates (default: America/New_York)

To find your frame ID:
1. Log in to the Skylight app
2. Use a proxy tool to capture API traffic
3. Look for the frame ID in URLs like /api/frames/{frameId}/chores
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

/**
 * Check if config uses managed OAuth login via email/password
 */
export function usesEmailAuth(config: Config): boolean {
  return !!(config.email && config.password);
}

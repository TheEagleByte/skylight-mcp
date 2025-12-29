import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { initializeClient } from "./api/client.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerChoreTools } from "./tools/chores.js";
import { registerListTools } from "./tools/lists.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerFamilyTools } from "./tools/family.js";
import { registerRewardTools } from "./tools/rewards.js";
import { registerMiscTools } from "./tools/misc.js";
import { registerMealTools } from "./tools/meals.js";
import { registerPhotoTools } from "./tools/photos.js";

/**
 * Create and configure the MCP server
 */
export async function createServer(): Promise<{
  start: () => Promise<void>;
}> {
  // Validate configuration before starting
  loadConfig();

  // Initialize client and get subscription status BEFORE tool registration
  const client = await initializeClient();
  const hasPlus = client.hasPlus();

  const server = new McpServer({
    name: "skylight",
    version: "1.0.0",
  });

  // Register base tools (always available)
  registerCalendarTools(server);
  registerChoreTools(server);
  registerListTools(server);
  registerTaskTools(server);
  registerFamilyTools(server);
  registerMiscTools(server);

  // Register Plus-only tools (hidden for non-Plus users)
  if (hasPlus) {
    registerRewardTools(server);
    registerMealTools(server);
    registerPhotoTools(server);
  }

  return {
    start: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error(`Skylight MCP Server started (Plus: ${hasPlus})`);
    },
  };
}

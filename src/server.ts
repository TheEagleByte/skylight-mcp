import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerChoreTools } from "./tools/chores.js";
import { registerListTools } from "./tools/lists.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerFamilyTools } from "./tools/family.js";
import { registerRewardTools } from "./tools/rewards.js";

/**
 * Create and configure the MCP server
 */
export async function createServer(): Promise<{
  start: () => Promise<void>;
}> {
  // Validate configuration before starting
  loadConfig();

  const server = new McpServer({
    name: "skylight",
    version: "1.0.0",
  });

  // Register all tools
  registerCalendarTools(server);
  registerChoreTools(server);
  registerListTools(server);
  registerTaskTools(server);
  registerFamilyTools(server);
  registerRewardTools(server);

  return {
    start: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error("Skylight MCP Server started");
    },
  };
}

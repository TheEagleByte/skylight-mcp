import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getLists, getListWithItems, findListByName, findListByType } from "../api/endpoints/lists.js";
import { formatErrorForMcp } from "../utils/errors.js";

export function registerListTools(server: McpServer): void {
  // get_lists tool
  server.tool(
    "get_lists",
    `Get all lists from Skylight (grocery lists, to-do lists, etc.).

Use this to see what lists are available before adding items.
Returns list names, types (shopping/to_do), and item counts.`,
    {},
    async () => {
      try {
        const lists = await getLists();

        if (lists.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No lists found in Skylight.",
              },
            ],
          };
        }

        const listSummary = lists
          .map((list) => {
            const attrs = list.attributes;
            const itemCount = list.relationships?.list_items?.data?.length ?? 0;
            const parts = [
              `- ${attrs.label}`,
              `  Type: ${attrs.kind === "shopping" ? "Shopping list" : "To-do list"}`,
              `  Items: ${itemCount}`,
            ];

            if (attrs.default_grocery_list) {
              parts.push(`  (Default grocery list)`);
            }

            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Available lists:\n\n${listSummary}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatErrorForMcp(error as Error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // get_list_items tool
  server.tool(
    "get_list_items",
    `Get items from a specific Skylight list.

Use this to answer:
- "What's on the grocery list?"
- "Show me my to-do list"
- "What items are on [list name]?"

Returns items organized by section with their completion status.`,
    {
      listName: z
        .string()
        .optional()
        .describe("List name to query (e.g., 'Grocery List'). If omitted, shows the default grocery list."),
      listType: z
        .enum(["shopping", "to_do"])
        .optional()
        .describe("Type of list to query. Alternative to listName."),
      includeCompleted: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include completed/checked-off items"),
    },
    async ({ listName, listType, includeCompleted }) => {
      try {
        // Find the list
        let list;
        if (listName) {
          list = await findListByName(listName);
          if (!list) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Could not find a list named "${listName}". Use get_lists to see available lists.`,
                },
              ],
              isError: true,
            };
          }
        } else if (listType) {
          list = await findListByType(listType);
          if (!list) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No ${listType === "shopping" ? "shopping" : "to-do"} list found.`,
                },
              ],
              isError: true,
            };
          }
        } else {
          // Default to the default grocery list
          list = await findListByType("shopping", true);
          if (!list) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "No default grocery list found. Use get_lists to see available lists.",
                },
              ],
              isError: true,
            };
          }
        }

        // Get list with items
        const result = await getListWithItems(list.id);
        let items = result.items;

        // Filter out completed items if requested
        if (!includeCompleted) {
          items = items.filter((item) => item.attributes.status === "pending");
        }

        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `${result.list.attributes.label} is empty${includeCompleted ? "" : " (no pending items)"}.`,
              },
            ],
          };
        }

        // Group items by section
        const sections = new Map<string, typeof items>();
        const noSection: typeof items = [];

        for (const item of items) {
          const section = item.attributes.section;
          if (section) {
            if (!sections.has(section)) {
              sections.set(section, []);
            }
            sections.get(section)!.push(item);
          } else {
            noSection.push(item);
          }
        }

        // Format output
        const output: string[] = [`${result.list.attributes.label}:`];

        // Items without sections first
        if (noSection.length > 0) {
          for (const item of noSection) {
            const status = item.attributes.status === "completed" ? "[x]" : "[ ]";
            output.push(`${status} ${item.attributes.label}`);
          }
        }

        // Then items by section
        for (const [sectionName, sectionItems] of sections) {
          output.push(`\n${sectionName}:`);
          for (const item of sectionItems) {
            const status = item.attributes.status === "completed" ? "[x]" : "[ ]";
            output.push(`${status} ${item.attributes.label}`);
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: output.join("\n"),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: formatErrorForMcp(error as Error),
            },
          ],
          isError: true,
        };
      }
    }
  );
}

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getLists,
  getListWithItems,
  findListByName,
  findListByType,
  createList,
  updateList,
  deleteList,
  createListItem,
  updateListItem,
  deleteListItem,
} from "../api/endpoints/lists.js";
import { formatErrorForMcp } from "../utils/errors.js";

/**
 * Result of resolving a list ID from listId or listName
 */
type ListResolutionResult =
  | { success: true; id: string; name: string }
  | { success: false; error: string };

/**
 * Resolve a list ID from either listId or listName
 * Returns error if neither provided (unless defaultToGrocery is true)
 */
async function resolveListId(
  listId?: string,
  listName?: string,
  defaultToGrocery = false
): Promise<ListResolutionResult> {
  if (listId) {
    return { success: true, id: listId, name: listName ?? listId };
  }

  if (listName) {
    const list = await findListByName(listName);
    if (!list) {
      return { success: false, error: `Could not find list "${listName}"` };
    }
    return { success: true, id: list.id, name: list.attributes.label };
  }

  if (defaultToGrocery) {
    const list = await findListByType("shopping", true);
    if (!list) {
      return { success: false, error: "No default grocery list found. Use get_lists to see available lists." };
    }
    return { success: true, id: list.id, name: list.attributes.label };
  }

  return { success: false, error: "Either listId or listName is required" };
}

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
              text: formatErrorForMcp(error),
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
              text: formatErrorForMcp(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // create_list tool
  server.tool(
    "create_list",
    `Create a new list in Skylight.

Use this when:
- Creating a new shopping/grocery list
- Creating a new to-do list

Parameters:
- label (required): Name of the list (e.g., "Vacation Packing", "Weekly Groceries")
- kind (required): "shopping" for grocery/shopping lists, "to_do" for task lists
- color: Optional color for the list

Returns: The created list details.`,
    {
      label: z.string().describe("Name of the list (e.g., 'Vacation Packing')"),
      kind: z.enum(["shopping", "to_do"]).describe("Type of list: 'shopping' or 'to_do'"),
      color: z.string().optional().describe("Optional color for the list"),
    },
    async ({ label, kind, color }) => {
      try {
        const list = await createList(label, kind, color);
        return {
          content: [
            {
              type: "text" as const,
              text: `Created ${kind === "shopping" ? "shopping" : "to-do"} list "${list.attributes.label}" (ID: ${list.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );

  // update_list tool
  server.tool(
    "update_list",
    `Update an existing list's name or settings.

Use this when:
- Renaming a list
- Changing a list's type or color

Parameters:
- listId: ID of the list to update (use get_lists to find IDs)
- listName: Name of the list to update (alternative to listId)
- label: New name for the list
- kind: New type ("shopping" or "to_do")
- color: New color for the list

Returns: The updated list details.`,
    {
      listId: z.string().optional().describe("ID of the list to update"),
      listName: z.string().optional().describe("Name of the list to update (alternative to listId)"),
      label: z.string().optional().describe("New name for the list"),
      kind: z.enum(["shopping", "to_do"]).optional().describe("New type for the list"),
      color: z.string().nullable().optional().describe("New color for the list"),
    },
    async ({ listId, listName, label, kind, color }) => {
      try {
        const resolved = await resolveListId(listId, listName);
        if (!resolved.success) {
          return {
            content: [{ type: "text" as const, text: resolved.error }],
            isError: true,
          };
        }

        const updates: { label?: string; kind?: "shopping" | "to_do"; color?: string | null } = {};
        if (label !== undefined) updates.label = label;
        if (kind !== undefined) updates.kind = kind;
        if (color !== undefined) updates.color = color;

        const updated = await updateList(resolved.id, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: `Updated list: "${updated.attributes.label}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );

  // delete_list tool
  server.tool(
    "delete_list",
    `Delete a list from Skylight.

Use this when:
- Removing an old or unused list
- Deleting a temporary list

Parameters:
- listId: ID of the list to delete (use get_lists to find IDs)
- listName: Name of the list to delete (alternative to listId)

Note: This permanently deletes the list and all its items.`,
    {
      listId: z.string().optional().describe("ID of the list to delete"),
      listName: z.string().optional().describe("Name of the list to delete (alternative to listId)"),
    },
    async ({ listId, listName }) => {
      try {
        const resolved = await resolveListId(listId, listName);
        if (!resolved.success) {
          return {
            content: [{ type: "text" as const, text: resolved.error }],
            isError: true,
          };
        }

        await deleteList(resolved.id);
        return {
          content: [
            {
              type: "text" as const,
              text: `Deleted list "${resolved.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );

  // create_list_item tool
  server.tool(
    "create_list_item",
    `Add an item to a Skylight list.

Use this when:
- Adding something to the grocery list: "Add milk to the shopping list"
- Creating a to-do item: "Put 'call doctor' on my to-do list"
- Adding items to any list

Parameters:
- label (required): The item text (e.g., "Milk", "Call doctor")
- listId: ID of the list to add to
- listName: Name of the list to add to (e.g., "Grocery List")
- section: Category within the list (e.g., "Dairy", "Produce")

If no list is specified, adds to the default grocery list.

Returns: Confirmation of the added item.

Related: Use get_lists to see available lists and their IDs.`,
    {
      label: z.string().describe("The item text to add (e.g., 'Milk', 'Call doctor')"),
      listId: z.string().optional().describe("ID of the list to add to"),
      listName: z.string().optional().describe("Name of the list (e.g., 'Grocery List', 'To-Do')"),
      section: z.string().optional().describe("Section/category within the list (e.g., 'Dairy', 'Produce')"),
    },
    async ({ label, listId, listName, section }) => {
      try {
        const resolved = await resolveListId(listId, listName, true);
        if (!resolved.success) {
          return {
            content: [{ type: "text" as const, text: resolved.error }],
            isError: true,
          };
        }

        const item = await createListItem(resolved.id, label, section);
        const sectionText = section ? ` in section "${section}"` : "";
        return {
          content: [
            {
              type: "text" as const,
              text: `Added "${item.attributes.label}" to ${resolved.name}${sectionText}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );

  // update_list_item tool
  server.tool(
    "update_list_item",
    `Update a list item (mark complete, rename, move to section).

Use this when:
- Marking an item as complete: "Check off milk from the list"
- Renaming an item: "Change 'milk' to '2% milk'"
- Moving an item to a different section

Parameters:
- itemId (required): ID of the item to update
- listId (required): ID of the list containing the item
- label: New text for the item
- status: "completed" to check off, "pending" to uncheck
- section: Move to a different section

Returns: The updated item details.`,
    {
      itemId: z.string().describe("ID of the item to update"),
      listId: z.string().describe("ID of the list containing the item"),
      label: z.string().optional().describe("New text for the item"),
      status: z.enum(["pending", "completed"]).optional().describe("'completed' to check off, 'pending' to uncheck"),
      section: z.string().nullable().optional().describe("Move to a different section (null to remove from section)"),
    },
    async ({ itemId, listId, label, status, section }) => {
      try {
        const updates: { label?: string; status?: "pending" | "completed"; section?: string | null } = {};
        if (label !== undefined) updates.label = label;
        if (status !== undefined) updates.status = status;
        if (section !== undefined) updates.section = section;

        const item = await updateListItem(listId, itemId, updates);
        const statusText = status === "completed" ? " (marked complete)" : status === "pending" ? " (marked pending)" : "";
        return {
          content: [
            {
              type: "text" as const,
              text: `Updated item: "${item.attributes.label}"${statusText}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );

  // delete_list_item tool
  server.tool(
    "delete_list_item",
    `Remove an item from a list.

Use this when:
- Removing an item that was added by mistake
- Deleting an item instead of marking it complete

Parameters:
- itemId (required): ID of the item to delete
- listId (required): ID of the list containing the item

Note: This permanently removes the item. Use update_list_item with status="completed" to check it off instead.`,
    {
      itemId: z.string().describe("ID of the item to delete"),
      listId: z.string().describe("ID of the list containing the item"),
    },
    async ({ itemId, listId }) => {
      try {
        await deleteListItem(listId, itemId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Deleted item from list`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error) }],
          isError: true,
        };
      }
    }
  );
}

import { getClient } from "../client.js";
import type {
  ListsResponse,
  ListResponse,
  ListResource,
  ListItemResource,
} from "../types.js";

/**
 * Get all lists
 */
export async function getLists(): Promise<ListResource[]> {
  const client = getClient();
  const response = await client.get<ListsResponse>("/api/frames/{frameId}/lists");
  return response.data;
}

export interface GetListWithItemsResult {
  list: ListResource;
  items: ListItemResource[];
  sections?: unknown[];
}

/**
 * Get a specific list with its items
 */
export async function getListWithItems(listId: string): Promise<GetListWithItemsResult> {
  const client = getClient();
  const response = await client.get<ListResponse>(`/api/frames/{frameId}/lists/${listId}`);

  return {
    list: response.data,
    items: (response.included as ListItemResource[]) ?? [],
    sections: response.meta?.sections as unknown[] | undefined,
  };
}

/**
 * Find a list by name (case-insensitive)
 */
export async function findListByName(name: string): Promise<ListResource | undefined> {
  const lists = await getLists();
  const lowerName = name.toLowerCase();
  return lists.find((list) => list.attributes.label.toLowerCase().includes(lowerName));
}

/**
 * Find a list by type (shopping or to_do)
 */
export async function findListByType(
  kind: "shopping" | "to_do",
  preferDefault = true
): Promise<ListResource | undefined> {
  const lists = await getLists();
  const filtered = lists.filter((list) => list.attributes.kind === kind);

  if (preferDefault && kind === "shopping") {
    const defaultList = filtered.find((list) => list.attributes.default_grocery_list);
    if (defaultList) return defaultList;
  }

  return filtered[0];
}

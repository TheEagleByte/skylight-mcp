import { getClient } from "../client.js";
import type {
  ListsResponse,
  ListResponse,
  ListResource,
  ListItemResource,
  CreateListRequest,
  UpdateListRequest,
  CreateListItemRequest,
  UpdateListItemRequest,
  ListItemResponse,
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

/**
 * Create a new list
 */
export async function createList(
  label: string,
  kind: "shopping" | "to_do",
  color?: string
): Promise<ListResource> {
  const client = getClient();
  const request: CreateListRequest = {
    data: {
      type: "list",
      attributes: {
        label,
        kind,
        color: color ?? null,
      },
    },
  };
  const response = await client.post<ListResponse>("/api/frames/{frameId}/lists", request);
  return response.data;
}

/**
 * Update an existing list
 */
export async function updateList(
  listId: string,
  updates: { label?: string; kind?: "shopping" | "to_do"; color?: string | null }
): Promise<ListResource> {
  const client = getClient();
  const request: UpdateListRequest = {
    data: {
      type: "list",
      attributes: updates,
    },
  };
  const response = await client.request<ListResponse>(`/api/frames/{frameId}/lists/${listId}`, {
    method: "PUT",
    body: request,
  });
  return response.data;
}

/**
 * Delete a list
 */
export async function deleteList(listId: string): Promise<void> {
  const client = getClient();
  await client.request(`/api/frames/{frameId}/lists/${listId}`, { method: "DELETE" });
}

/**
 * Create a new list item
 */
export async function createListItem(
  listId: string,
  label: string,
  section?: string
): Promise<ListItemResource> {
  const client = getClient();
  const request: CreateListItemRequest = {
    data: {
      type: "list_item",
      attributes: {
        label,
        section: section ?? null,
      },
    },
  };
  const response = await client.post<ListItemResponse>(
    `/api/frames/{frameId}/lists/${listId}/list_items`,
    request
  );
  return response.data;
}

/**
 * Update a list item
 */
export async function updateListItem(
  listId: string,
  itemId: string,
  updates: { label?: string; status?: "pending" | "completed"; section?: string | null }
): Promise<ListItemResource> {
  const client = getClient();
  const request: UpdateListItemRequest = {
    data: {
      type: "list_item",
      attributes: updates,
    },
  };
  const response = await client.request<ListItemResponse>(
    `/api/frames/{frameId}/lists/${listId}/list_items/${itemId}`,
    { method: "PUT", body: request }
  );
  return response.data;
}

/**
 * Delete a list item
 */
export async function deleteListItem(listId: string, itemId: string): Promise<void> {
  const client = getClient();
  await client.request(`/api/frames/{frameId}/lists/${listId}/list_items/${itemId}`, {
    method: "DELETE",
  });
}

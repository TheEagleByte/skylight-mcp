import { getClient } from "../client.js";
import type {
  ChoresResponse,
  ChoreResponse,
  ChoreResource,
  CategoryResource,
  UpdateChoreRequest,
} from "../types.js";

export interface GetChoresOptions {
  after?: string;
  before?: string;
  includeLate?: boolean;
  filterLinkedToProfile?: boolean;
}

export interface GetChoresResult {
  chores: ChoreResource[];
  categories: CategoryResource[];
}

/**
 * Get chores for a date range
 */
export async function getChores(options: GetChoresOptions = {}): Promise<GetChoresResult> {
  const client = getClient();
  const params: Record<string, string | boolean | undefined> = {
    after: options.after,
    before: options.before,
    include_late: options.includeLate,
  };

  if (options.filterLinkedToProfile) {
    params.filter = "linked_to_profile";
  }

  const response = await client.get<ChoresResponse>(
    "/api/frames/{frameId}/chores",
    params
  );

  return {
    chores: response.data,
    categories: response.included ?? [],
  };
}

export interface CreateChoreOptions {
  summary: string;
  start: string;
  startTime?: string;
  recurring?: boolean;
  recurrenceSet?: string;
  categoryId?: string;
  rewardPoints?: number;
  emojiIcon?: string;
}

/**
 * Create a new chore
 *
 * Uses the /chores/create_multiple endpoint with flat object format
 * instead of JSON:API nested structure, as required by the Skylight API.
 * See: https://github.com/TheEagleByte/skylight-mcp/issues/25
 */
export async function createChore(options: CreateChoreOptions): Promise<ChoreResource> {
  const client = getClient();

  // Use flat object format for create_multiple endpoint
  const request: Record<string, unknown> = {
    summary: options.summary,
    start: options.start,
    start_time: options.startTime ?? null,
    recurring: options.recurring ?? false,
    recurring_until: null,
    routine: false,
    reward_points: options.rewardPoints ?? null,
    emoji_icon: options.emojiIcon ?? null,
    recurrence_set: options.recurrenceSet ? [options.recurrenceSet] : null,
    category_id: options.categoryId ?? null,
    category_ids: options.categoryId ? [options.categoryId] : [],
  };

  const response = await client.post<ChoresResponse>(
    "/api/frames/{frameId}/chores/create_multiple",
    request
  );

  // The create_multiple endpoint returns an array - get the first item
  const chore = response.data?.[0];

  if (!chore) {
    throw new Error("Failed to create chore: no data returned from API");
  }

  return chore;
}

export interface UpdateChoreOptions {
  summary?: string;
  start?: string;
  startTime?: string | null;
  status?: string;
  recurring?: boolean;
  recurrenceSet?: string | null;
  categoryId?: string | null;
  rewardPoints?: number | null;
  emojiIcon?: string | null;
}

/**
 * Update an existing chore
 */
export async function updateChore(
  choreId: string,
  options: UpdateChoreOptions
): Promise<ChoreResource> {
  const client = getClient();

  const request: UpdateChoreRequest = {
    data: {
      type: "chore",
      attributes: {},
    },
  };

  // Map options to attributes
  if (options.summary !== undefined) request.data.attributes.summary = options.summary;
  if (options.start !== undefined) request.data.attributes.start = options.start;
  if (options.startTime !== undefined) request.data.attributes.start_time = options.startTime;
  if (options.status !== undefined) request.data.attributes.status = options.status;
  if (options.recurring !== undefined) request.data.attributes.recurring = options.recurring;
  if (options.recurrenceSet !== undefined) request.data.attributes.recurrence_set = options.recurrenceSet;
  if (options.rewardPoints !== undefined) request.data.attributes.reward_points = options.rewardPoints;
  if (options.emojiIcon !== undefined) request.data.attributes.emoji_icon = options.emojiIcon;

  // Handle category relationship
  if (options.categoryId !== undefined) {
    if (options.categoryId === null) {
      request.data.relationships = { category: { data: null } };
    } else {
      request.data.relationships = {
        category: { data: { type: "category", id: options.categoryId } },
      };
    }
  }

  const response = await client.request<ChoreResponse>(
    `/api/frames/{frameId}/chores/${choreId}`,
    { method: "PUT", body: request }
  );

  return response.data;
}

/**
 * Delete a chore
 */
export async function deleteChore(choreId: string): Promise<void> {
  const client = getClient();
  await client.request(`/api/frames/{frameId}/chores/${choreId}`, {
    method: "DELETE",
  });
}

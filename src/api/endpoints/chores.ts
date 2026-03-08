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
  status?: string;
  recurring?: boolean;
  recurrenceSet?: string;
  categoryId?: string;
  rewardPoints?: number;
  emojiIcon?: string;
}

/**
 * Create a new chore
 */
export async function createChore(options: CreateChoreOptions): Promise<ChoreResource> {
  const client = getClient();

  // The Skylight API uses a flat request body (not JSON:API format)
  const body: Record<string, unknown> = {
    summary: options.summary,
    start: options.start,
    start_time: options.startTime ?? null,
    recurring: options.recurring ?? false,
    reward_points: options.rewardPoints ?? null,
    emoji_icon: options.emojiIcon ?? null,
  };

  if (options.categoryId) {
    body.category_id = options.categoryId;
    body.category_ids = [options.categoryId];
  }

  if (options.recurrenceSet) {
    body.recurrence_set = [options.recurrenceSet];
  }

  // create_multiple returns { data: ChoreResource[] }
  const response = await client.post<{ data: ChoreResource[] }>(
    "/api/frames/{frameId}/chores/create_multiple",
    body
  );

  return response.data[0];
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
export async function deleteChore(choreId: string, applyTo?: string): Promise<void> {
  const client = getClient();
  const url = applyTo
    ? `/api/frames/{frameId}/chores/${choreId}?apply_to=${encodeURIComponent(applyTo)}`
    : `/api/frames/{frameId}/chores/${choreId}`;
  await client.request(url, { method: "DELETE" });
}

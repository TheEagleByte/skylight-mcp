import { getClient } from "../client.js";
import type {
  ChoresResponse,
  ChoreResponse,
  ChoreResource,
  CategoryResource,
  CreateMultipleChoresRequest,
  CreateMultipleChoresResponse,
  UpdateChoreFlatRequest,
  DeleteChoreRequest,
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
  categoryId: string;
  rewardPoints?: number;
  emojiIcon?: string;
}

/**
 * Create a new chore.
 *
 * Uses POST /chores/create_multiple with a flat body — the plain
 * POST /chores endpoint documented for other resources 422s on chores
 * regardless of payload shape. categoryId is required: up_for_grabs is
 * the documented alternative to category_ids, but it's rejected outright
 * on this account/API version ("API version does not support Up for
 * Grabs chores"), confirmed by direct testing — so there's no working
 * way to create an unassigned chore here.
 */
export async function createChore(options: CreateChoreOptions): Promise<ChoreResource> {
  const client = getClient();

  const request: CreateMultipleChoresRequest = {
    summary: options.summary,
    start: options.start,
    start_time: options.startTime ?? null,
    recurring: options.recurring ?? false,
    recurrence_set: options.recurrenceSet ? [options.recurrenceSet] : null,
    reward_points: options.rewardPoints ?? null,
    emoji_icon: options.emojiIcon ?? null,
    category_ids: [options.categoryId],
  };

  const response = await client.post<CreateMultipleChoresResponse>(
    "/api/frames/{frameId}/chores/create_multiple",
    request
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
  categoryId?: string;
  rewardPoints?: number | null;
  emojiIcon?: string | null;
  applyTo?: "all" | "future";
}

/**
 * Update an existing chore.
 *
 * Uses a flat body, NOT the JSON:API-wrapped shape every other update
 * endpoint uses. Confirmed by direct testing: a JSON:API PUT
 * ({ data: { attributes: {...} } }) against a recurring chore returns
 * 200 but silently no-ops — every attribute, not just recurrence-related
 * ones — with no error. The flat body + applyTo is what actually applies
 * changes to a recurring chore's instances; non-recurring chores work
 * with or without applyTo.
 *
 * Note: there is no working "unassign" (up_for_grabs) path on update
 * either, for the same reason createChore requires categoryId — so
 * categoryId here can only reassign to another category, never clear it.
 */
export async function updateChore(
  choreId: string,
  options: UpdateChoreOptions
): Promise<ChoreResource> {
  const client = getClient();

  const request: UpdateChoreFlatRequest = {};

  if (options.summary !== undefined) request.summary = options.summary;
  if (options.start !== undefined) request.start = options.start;
  if (options.startTime !== undefined) request.start_time = options.startTime;
  if (options.status !== undefined) request.status = options.status;
  if (options.recurring !== undefined) request.recurring = options.recurring;
  if (options.recurrenceSet !== undefined) {
    request.recurrence_set = options.recurrenceSet ? [options.recurrenceSet] : null;
  }
  if (options.rewardPoints !== undefined) request.reward_points = options.rewardPoints;
  if (options.emojiIcon !== undefined) request.emoji_icon = options.emojiIcon;
  if (options.categoryId !== undefined) request.category_id = options.categoryId;
  if (options.applyTo !== undefined) request.apply_to = options.applyTo;

  const response = await client.request<ChoreResponse>(
    `/api/frames/{frameId}/chores/${choreId}`,
    { method: "PUT", body: request }
  );

  return response.data;
}

/**
 * Delete a chore.
 *
 * A recurring occurrence (choreId like "123-2026-08-23") requires applyTo
 * or the API rejects it with a 400 ("you must have a valid value for
 * apply_to"). Non-recurring chores don't need it.
 */
export async function deleteChore(choreId: string, applyTo?: "all" | "future"): Promise<void> {
  const client = getClient();
  const body: DeleteChoreRequest | undefined = applyTo ? { apply_to: applyTo } : undefined;
  await client.request(`/api/frames/{frameId}/chores/${choreId}`, {
    method: "DELETE",
    body,
  });
}

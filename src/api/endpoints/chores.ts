import { getClient } from "../client.js";
import type {
  ChoresResponse,
  ChoreResponse,
  ChoreResource,
  CategoryResource,
  CreateChoreRequest,
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

  const request: CreateChoreRequest = {
    data: {
      type: "chore",
      attributes: {
        summary: options.summary,
        start: options.start,
        start_time: options.startTime ?? null,
        status: options.status ?? "pending",
        recurring: options.recurring ?? false,
        recurrence_set: options.recurrenceSet ?? null,
        reward_points: options.rewardPoints ?? null,
        emoji_icon: options.emojiIcon ?? null,
      },
    },
  };

  // Add category relationship if provided
  if (options.categoryId) {
    request.data.relationships = {
      category: {
        data: {
          type: "category",
          id: options.categoryId,
        },
      },
    };
  }

  const response = await client.post<ChoreResponse>(
    "/api/frames/{frameId}/chores",
    request
  );

  return response.data;
}

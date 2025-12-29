import { getClient } from "../client.js";
import type {
  TaskBoxItemResponse,
  TaskBoxItemResource,
  CreateTaskBoxItemRequest,
} from "../types.js";

export interface CreateTaskBoxItemOptions {
  summary: string;
  emojiIcon?: string;
  routine?: boolean;
  rewardPoints?: number;
}

/**
 * Create a task box item
 * Task box items are unscheduled tasks that can later be assigned to specific dates
 */
export async function createTaskBoxItem(
  options: CreateTaskBoxItemOptions
): Promise<TaskBoxItemResource> {
  const client = getClient();

  const request: CreateTaskBoxItemRequest = {
    data: {
      type: "task_box_item",
      attributes: {
        summary: options.summary,
        emoji_icon: options.emojiIcon ?? null,
        routine: options.routine ?? false,
        reward_points: options.rewardPoints ?? null,
      },
    },
  };

  const response = await client.post<TaskBoxItemResponse>(
    "/api/frames/{frameId}/task_box/items",
    request
  );

  return response.data;
}

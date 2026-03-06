import { getClient } from "../client.js";
import type {
  RewardsResponse,
  RewardResource,
  RewardResponse,
  RewardPointsResponse,
  RewardPointResource,
  CreateRewardRequest,
  UpdateRewardRequest,
} from "../types.js";

export interface GetRewardsOptions {
  redeemedAtMin?: string;
}

/**
 * Get rewards (items that can be redeemed with points)
 */
export async function getRewards(options: GetRewardsOptions = {}): Promise<RewardResource[]> {
  const client = getClient();
  const response = await client.get<RewardsResponse>(
    "/api/frames/{frameId}/rewards",
    {
      redeemed_at_min: options.redeemedAtMin,
    }
  );
  return response.data;
}

/**
 * Get reward points for family members
 */
export async function getRewardPoints(): Promise<RewardPointResource[]> {
  const client = getClient();
  const response = await client.get<RewardPointsResponse>(
    "/api/frames/{frameId}/reward_points"
  );
  return response.data;
}

export interface CreateRewardOptions {
  name: string;
  pointValue: number;
  description?: string;
  emojiIcon?: string;
  categoryIds?: string[];
  respawnOnRedemption?: boolean;
}

/**
 * Create a new reward
 */
export async function createReward(options: CreateRewardOptions): Promise<RewardResource> {
  const client = getClient();
  const request: CreateRewardRequest = {
    data: {
      type: "reward",
      attributes: {
        name: options.name,
        point_value: options.pointValue,
        description: options.description ?? null,
        emoji_icon: options.emojiIcon ?? null,
        respawn_on_redemption: options.respawnOnRedemption ?? false,
      },
    },
  };

  if (options.categoryIds && options.categoryIds.length > 0) {
    request.data.relationships = {
      categories: {
        data: options.categoryIds.map((id) => ({ type: "category", id })),
      },
    };
  }

  const response = await client.post<RewardResponse>("/api/frames/{frameId}/rewards", request);
  return response.data;
}

export interface UpdateRewardOptions {
  name?: string;
  pointValue?: number;
  description?: string | null;
  emojiIcon?: string | null;
  categoryIds?: string[];
  respawnOnRedemption?: boolean;
}

/**
 * Update an existing reward
 */
export async function updateReward(
  rewardId: string,
  options: UpdateRewardOptions
): Promise<RewardResource> {
  const client = getClient();
  const request: UpdateRewardRequest = {
    data: {
      type: "reward",
      attributes: {},
    },
  };

  if (options.name !== undefined) request.data.attributes.name = options.name;
  if (options.pointValue !== undefined) request.data.attributes.point_value = options.pointValue;
  if (options.description !== undefined) request.data.attributes.description = options.description;
  if (options.emojiIcon !== undefined) request.data.attributes.emoji_icon = options.emojiIcon;
  if (options.respawnOnRedemption !== undefined) {
    request.data.attributes.respawn_on_redemption = options.respawnOnRedemption;
  }

  if (options.categoryIds) {
    request.data.relationships = {
      categories: {
        data: options.categoryIds.map((id) => ({ type: "category", id })),
      },
    };
  }

  const response = await client.request<RewardResponse>(
    `/api/frames/{frameId}/rewards/${rewardId}`,
    { method: "PATCH", body: request }
  );
  return response.data;
}

/**
 * Delete a reward
 */
export async function deleteReward(rewardId: string): Promise<void> {
  const client = getClient();
  await client.request(`/api/frames/{frameId}/rewards/${rewardId}`, {
    method: "DELETE",
  });
}

/**
 * Redeem a reward (spend points)
 */
export async function redeemReward(
  rewardId: string,
  categoryId?: string
): Promise<RewardResource> {
  const client = getClient();
  const body = categoryId ? { category_id: categoryId } : {};
  const response = await client.post<RewardResponse>(
    `/api/frames/{frameId}/rewards/${rewardId}/redeem`,
    body
  );
  return response.data;
}

/**
 * Unredeem a reward (cancel redemption)
 */
export async function unredeemReward(rewardId: string): Promise<RewardResource> {
  const client = getClient();
  const response = await client.post<RewardResponse>(
    `/api/frames/{frameId}/rewards/${rewardId}/unredeem`,
    {}
  );
  return response.data;
}

/**
 * Reset reward points for a family member by creating a temporary reward
 * matching their exact balance, redeeming it, then deleting it.
 *
 * This workaround is needed because there is no direct API endpoint to
 * reset point balances.
 */
export async function resetRewardPoints(
  categoryId: number,
  currentBalance: number
): Promise<void> {
  if (currentBalance <= 0) return;

  const client = getClient();

  // Create a temporary reward using flat body format (required by API)
  const createResponse = await client.post<RewardsResponse>(
    "/api/frames/{frameId}/rewards",
    {
      name: "__point_reset__",
      point_value: currentBalance,
      category_ids: [categoryId],
      respawn_on_redemption: false,
    }
  );

  const tempReward = createResponse.data[0];
  if (!tempReward) {
    throw new Error("Failed to create temporary reward for point reset");
  }

  try {
    // Redeem the temp reward to drain the balance
    await client.post<RewardResponse>(
      `/api/frames/{frameId}/rewards/${tempReward.id}/redeem`,
      { category_id: String(categoryId) }
    );
  } finally {
    // Always clean up the temp reward
    await client.request(`/api/frames/{frameId}/rewards/${tempReward.id}`, {
      method: "DELETE",
    });
  }
}

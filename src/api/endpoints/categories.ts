import { getClient } from "../client.js";
import type { CategoriesResponse, CategoryResource } from "../types.js";

// Cache for categories (family members)
let categoriesCache: CategoryResource[] | null = null;
let categoriesCachedAt = 0;
let categoriesFetchPromise: Promise<CategoryResource[]> | null = null;

// Cache TTL: 5 minutes - allows new family members to appear without restart
// while still reducing API calls for frequent operations
const CATEGORIES_CACHE_TTL = 5 * 60 * 1000;

/**
 * Get all categories (family members/profiles)
 *
 * Uses promise deduplication to prevent thundering herd when multiple
 * concurrent requests occur while the cache is invalid.
 */
export async function getCategories(useCache = true): Promise<CategoryResource[]> {
  // Check cache validity with inline null check for proper type narrowing
  if (useCache && categoriesCache !== null && (Date.now() - categoriesCachedAt) < CATEGORIES_CACHE_TTL) {
    return categoriesCache;
  }

  // Deduplicate concurrent fetches - reuse pending promise if one exists
  if (categoriesFetchPromise) {
    return categoriesFetchPromise;
  }

  categoriesFetchPromise = (async () => {
    try {
      const client = getClient();
      const response = await client.get<CategoriesResponse>("/api/frames/{frameId}/categories");
      categoriesCache = response.data;
      categoriesCachedAt = Date.now();
      return response.data;
    } finally {
      categoriesFetchPromise = null;
    }
  })();

  return categoriesFetchPromise;
}

/**
 * Clear the categories cache
 */
export function clearCategoriesCache(): void {
  categoriesCache = null;
  categoriesCachedAt = 0;
  categoriesFetchPromise = null;
}

/**
 * Find a category by name (case-insensitive partial match)
 * Categories represent family members like "Dad", "Mom", "Kids", etc.
 */
export async function findCategoryByName(name: string): Promise<CategoryResource | undefined> {
  const categories = await getCategories();
  const lowerName = name.toLowerCase();

  return categories.find((cat) => {
    const label = cat.attributes.label?.toLowerCase();
    return label && (label === lowerName || label.includes(lowerName));
  });
}

/**
 * Get categories that are linked to profiles (actual family members)
 */
export async function getFamilyMembers(): Promise<CategoryResource[]> {
  const categories = await getCategories();
  return categories.filter((cat) => cat.attributes.linked_to_profile);
}

/**
 * Get categories selected for the chore chart
 */
export async function getChoreChartCategories(): Promise<CategoryResource[]> {
  const categories = await getCategories();
  return categories.filter((cat) => cat.attributes.selected_for_chore_chart);
}

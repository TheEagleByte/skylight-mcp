import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getMealCategories,
  getRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addRecipeToGroceryList,
  getMealSittings,
  createMealSitting,
} from "../api/endpoints/meals.js";
import { parseDate, formatDateForDisplay, getTodayDate, getDateOffset } from "../utils/dates.js";
import { formatErrorForMcp } from "../utils/errors.js";
import { getConfig } from "../config.js";

export function registerMealTools(server: McpServer): void {
  // get_meal_categories tool
  server.tool(
    "get_meal_categories",
    `Get meal categories (Breakfast, Lunch, Dinner, etc.) - Plus subscription required.

Use this when:
- Finding category IDs for scheduling meals
- Seeing what meal times are available

Returns: List of meal categories with IDs.`,
    {},
    async () => {
      try {
        const categories = await getMealCategories();

        if (categories.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No meal categories found." }],
          };
        }

        const list = categories
          .map((cat) => `- ${cat.attributes.name ?? "Unknown"} (ID: ${cat.id})`)
          .join("\n");

        return {
          content: [{ type: "text" as const, text: `Meal categories:\n\n${list}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // get_recipes tool
  server.tool(
    "get_recipes",
    `Get all saved recipes - Plus subscription required.

Use this when:
- Browsing available recipes
- Finding a recipe ID for meal planning

Returns: List of recipes with their details.`,
    {},
    async () => {
      try {
        const recipes = await getRecipes();

        if (recipes.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No recipes found." }],
          };
        }

        const list = recipes
          .map((recipe) => {
            const parts = [`- ${recipe.attributes.summary ?? "Untitled"} (ID: ${recipe.id})`];
            if (recipe.attributes.description) {
              parts.push(`  Description: ${recipe.attributes.description}`);
            }
            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [{ type: "text" as const, text: `Recipes:\n\n${list}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // get_recipe tool
  server.tool(
    "get_recipe",
    `Get details for a specific recipe - Plus subscription required.

Parameters:
- recipeId (required): ID of the recipe

Returns: Recipe details including description.`,
    {
      recipeId: z.string().describe("ID of the recipe"),
    },
    async ({ recipeId }) => {
      try {
        const recipe = await getRecipe(recipeId);

        const parts = [`Recipe: ${recipe.attributes.summary ?? "Untitled"}`];
        for (const [key, value] of Object.entries(recipe.attributes)) {
          if (value !== null && value !== undefined && key !== "summary") {
            parts.push(`${key}: ${value}`);
          }
        }

        return {
          content: [{ type: "text" as const, text: parts.join("\n") }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // create_recipe tool
  server.tool(
    "create_recipe",
    `Create a new recipe - Plus subscription required.

Use this when:
- Adding a new family recipe
- Saving a meal for meal planning

Parameters:
- summary (required): Recipe name
- description: Recipe details or instructions
- mealCategoryId: Category ID (use get_meal_categories)

Returns: The created recipe.`,
    {
      summary: z.string().describe("Recipe name (e.g., 'Spaghetti Bolognese')"),
      description: z.string().optional().describe("Recipe details or instructions"),
      mealCategoryId: z.string().optional().describe("Meal category ID"),
    },
    async ({ summary, description, mealCategoryId }) => {
      try {
        const recipe = await createRecipe({ summary, description, mealCategoryId });
        return {
          content: [
            {
              type: "text" as const,
              text: `Created recipe "${summary}" (ID: ${recipe.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // update_recipe tool
  server.tool(
    "update_recipe",
    `Update an existing recipe - Plus subscription required.

Parameters:
- recipeId (required): ID of the recipe
- summary: New name
- description: New description

Returns: The updated recipe.`,
    {
      recipeId: z.string().describe("ID of the recipe to update"),
      summary: z.string().optional().describe("New recipe name"),
      description: z.string().nullable().optional().describe("New description"),
    },
    async ({ recipeId, summary, description }) => {
      try {
        const updates: Parameters<typeof updateRecipe>[1] = {};
        if (summary !== undefined) updates.summary = summary;
        if (description !== undefined) updates.description = description;

        const recipe = await updateRecipe(recipeId, updates);
        return {
          content: [
            {
              type: "text" as const,
              text: `Updated recipe (ID: ${recipe.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // delete_recipe tool
  server.tool(
    "delete_recipe",
    `Delete a recipe - Plus subscription required.

Parameters:
- recipeId (required): ID of the recipe to delete

Note: This permanently removes the recipe.`,
    {
      recipeId: z.string().describe("ID of the recipe to delete"),
    },
    async ({ recipeId }) => {
      try {
        await deleteRecipe(recipeId);
        return {
          content: [{ type: "text" as const, text: `Deleted recipe (ID: ${recipeId})` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // add_recipe_to_grocery_list tool
  server.tool(
    "add_recipe_to_grocery_list",
    `Add a recipe's ingredients to the grocery list - Plus subscription required.

Use this when:
- Planning to make a recipe and need to buy ingredients
- Adding meal ingredients to shopping list

Parameters:
- recipeId (required): ID of the recipe

Returns: Confirmation that ingredients were added.`,
    {
      recipeId: z.string().describe("ID of the recipe"),
    },
    async ({ recipeId }) => {
      try {
        await addRecipeToGroceryList(recipeId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Added recipe ingredients to grocery list`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // get_meal_sittings tool
  server.tool(
    "get_meal_sittings",
    `Get scheduled meals for a date range - Plus subscription required.

Use this when:
- Viewing the meal plan for the week
- Checking what's scheduled for dinner

Parameters:
- date: Start date (defaults to today)
- dateEnd: End date (defaults to 7 days from start)

Returns: List of scheduled meals.`,
    {
      date: z.string().optional().describe("Start date (YYYY-MM-DD or 'today')"),
      dateEnd: z.string().optional().describe("End date (YYYY-MM-DD)"),
    },
    async ({ date, dateEnd }) => {
      try {
        const config = getConfig();
        const startDate = date ? parseDate(date, config.timezone) : getTodayDate(config.timezone);
        const endDate = dateEnd ? parseDate(dateEnd, config.timezone) : getDateOffset(7, config.timezone);

        const sittings = await getMealSittings({
          dateMin: startDate,
          dateMax: endDate,
        });

        if (sittings.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No meals scheduled for ${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}.`,
              },
            ],
          };
        }

        const list = sittings
          .map((sitting) => {
            const parts = [`- ${sitting.attributes.date ?? "Unknown date"}`];
            if (sitting.attributes.meal_time) {
              parts[0] += ` (${sitting.attributes.meal_time})`;
            }
            parts.push(`  ID: ${sitting.id}`);
            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [{ type: "text" as const, text: `Scheduled meals:\n\n${list}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );

  // create_meal_sitting tool
  server.tool(
    "create_meal_sitting",
    `Schedule a meal for a specific date - Plus subscription required.

Use this when:
- Planning meals for the week
- Scheduling a recipe for dinner

Parameters:
- date (required): Date for the meal (YYYY-MM-DD)
- mealCategoryId (required): Meal category ID (use get_meal_categories)
- recipeId: Recipe ID to schedule (optional)

Returns: The created meal sitting.`,
    {
      date: z.string().describe("Date for the meal (YYYY-MM-DD or 'today', 'tomorrow')"),
      mealCategoryId: z.string().describe("Meal category ID (e.g., ID for 'Dinner')"),
      recipeId: z.string().optional().describe("Recipe ID to schedule"),
    },
    async ({ date, mealCategoryId, recipeId }) => {
      try {
        const config = getConfig();
        const mealDate = parseDate(date, config.timezone);

        const sitting = await createMealSitting({
          date: mealDate,
          mealCategoryId,
          recipeId,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Scheduled meal for ${formatDateForDisplay(mealDate)} (ID: ${sitting.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatErrorForMcp(error as Error) }],
          isError: true,
        };
      }
    }
  );
}

'use strict';

/**
 * Mealie API client for making HTTP requests
 */
class MealieAPI {
  /**
   * @param {import('../config/MealieConfig')} config - Mealie configuration
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Make an HTTP request to the Mealie API
   * @param {string} method - HTTP method (GET, POST, PATCH, etc.)
   * @param {string} endpoint - API endpoint (e.g., '/recipes')
   * @param {object} [body] - Request body for POST/PATCH requests
   * @returns {Promise<Response>} Fetch response
   * @throws {Error} If request fails
   */
  async request(method, endpoint, body) {
    const url = `${this.config.baseUrl}/api${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(
        `Request failed with status ${response.status} ${response.statusText}`
      );
      error.status = response.status;
      error.responseText = errorText;
      throw error;
    }

    return response;
  }

  /**
   * Search for ingredients by name
   * @param {string} name - Ingredient name to search for
   * @returns {Promise<Array>} Array of matching ingredients
   */
  async searchIngredients(name) {
    try {
      const response = await this.request('GET', `/foods?search=${name}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ingredients: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a tag by name
   * @param {string} name - Tag name to search for
   * @returns {Promise<object|Array>} Tag object or empty array
   */
  async getTagByName(name) {
    try {
      const response = await this.request('GET', `/organizers/tags?search=${name}`);
      const tags = await response.json();
      return tags.items[0];
    } catch (error) {
      console.error(`Error fetching tags: ${error.message}`);
      return [];
    }
  }

  /**
   * Create a new ingredient/food in Mealie
   * @param {string} name - Name of the ingredient
   * @returns {Promise<object|null>} Created ingredient or null on error
   */
  async createIngredient(name) {
    try {
      const data = {
        name,
        description: `Auto-created ingredient: ${name}`
      };
      const response = await this.request('POST', '/foods', data);
      return await response.json();
    } catch (error) {
      console.error(`Error creating ingredient '${name}': ${error.message}`);
      if (error.responseText) {
        console.error(`Response: ${error.responseText}`);
      }
      return null;
    }
  }

  /**
   * Parse an ingredient string using Mealie's parser
   * @param {string} ingredientText - Raw ingredient text to parse
   * @returns {Promise<object|null>} Parsed ingredient or null
   */
  async parseIngredient(ingredientText) {
    const text = String(ingredientText ?? '').trim();
    if (!text) {
      return null;
    }

    const payloadVariants = [{ ingredient: text }, { input: text }, { text }];

    let lastError = null;

    for (let index = 0; index < payloadVariants.length; index += 1) {
      const payload = payloadVariants[index];
      try {
        const response = await this.request(
          'POST',
          '/parser/ingredient',
          payload
        );
        return await response.json();
      } catch (error) {
        lastError = error;
        const shouldRetry =
          error?.status &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 401 &&
          error.status !== 403 &&
          index < payloadVariants.length - 1;

        if (!shouldRetry) {
          break;
        }
      }
    }

    if (lastError) {
      console.error(`Error parsing ingredient '${text}': ${lastError.message}`);
      if (lastError.responseText) {
        console.error(`Response: ${lastError.responseText}`);
      }
    }

    return null;
  }

  /**
   * Get an ingredient by name
   * @param {string} name - Ingredient name
   * @returns {Promise<Array>} Matching ingredients
   */
  async getIngredientByName(name) {
    return await this.searchIngredients(name);
  }

  /**
   * Ensure an ingredient exists, creating it if necessary
   * @param {string} name - Ingredient name
   * @returns {Promise<object>} The ingredient
   */
  async ensureIngredientExists(name) {
    const ingredient = await this.getIngredientByName(name);

    if (ingredient && ingredient.length > 0) {
      console.log(`  ✓ Ingredient '${name}' already exists`);
      return ingredient;
    }

    console.log(`  + Creating ingredient '${name}'`);
    return this.createIngredient(name);
  }

  /**
   * Get all recipes
   * @returns {Promise<Array>} Array of recipes
   */
  async getRecipes() {
    try {
      const response = await this.request('GET', '/recipes');
      const data = await response.json();

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data.items)) {
        return data.items;
      }

      return [];
    } catch (error) {
      console.error(`Error fetching recipes: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a recipe by name
   * @param {string} name - Recipe name
   * @returns {Promise<object|null>} Recipe or null if not found
   */
  async getRecipeByName(name) {
    const recipes = await this.getRecipes();
    const nameLower = name.toLowerCase().trim();

    return (
      recipes.find(
        (recipe) =>
          typeof recipe?.name === 'string' &&
          recipe.name.toLowerCase().trim() === nameLower
      ) || null
    );
  }

  /**
   * Create a new recipe
   * @param {object} recipeData - Recipe data
   * @returns {Promise<object|null>} Created recipe or null on error
   */
  async createRecipe(recipeData) {
    try {
      const response = await this.request('POST', '/recipes', recipeData);
      return await response.json();
    } catch (error) {
      console.error(`Error creating recipe: ${error.message}`);
      if (error.responseText) {
        console.error(`Response: ${error.responseText}`);
      }
      return null;
    }
  }

  /**
   * Update an existing recipe
   * @param {string} slug - Recipe slug/ID
   * @param {object} recipeData - Updated recipe data
   * @returns {Promise<object|null>} Updated recipe or null on error
   */
  async updateRecipe(slug, recipeData) {
    try {
      const response = await this.request('PATCH', `/recipes/${slug}`, recipeData);
      return await response.json();
    } catch (error) {
      console.error(`Error updating recipe: ${error.message}`);
      if (error.responseText) {
        console.error(`Response: ${error.responseText}`);
      }
      return null;
    }
  }

  /**
   * Create a meal plan entry
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} entryType - Meal type (breakfast, lunch, dinner)
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<object|null>} Created meal plan or null on error
   */
  async createMealplan(date, entryType, recipeId) {
    try {
      const data = {
        date,
        entryType,
        recipeId
      };
      const response = await this.request(
        'POST',
        '/groups/mealplans',
        data
      );
      return await response.json();
    } catch (error) {
      console.error(`Error creating meal plan: ${error.message}`);
      if (error.responseText) {
        console.error(`Response: ${error.responseText}`);
      }
      return null;
    }
  }
}

module.exports = MealieAPI;

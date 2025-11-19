'use strict';

const { randomUUID } = require('crypto');
const { MEAL_TYPE_MAP, DAY_ORDER } = require('../constants');

/**
 * Service for creating Mealie recipes and meal plans from menu data
 */
class MealieMenuCreator {
  /**
   * @param {import('../api/MealieAPI')} api - Mealie API client
   */
  constructor(api) {
    this.api = api;
  }

  /**
   * Parse ingredient text using Mealie's parser
   * @param {string} ingredientText - Raw ingredient text
   * @returns {Promise<object>} Parsed ingredient data
   */
  async parseIngredientText(ingredientText) {
    const originalText = String(ingredientText ?? '').trim();
    if (!originalText) {
      return this.buildFallbackIngredient('');
    }

    const parserResponse = await this.api.parseIngredient(originalText);

    const parsed =
      this.normalizeParsedIngredient(parserResponse, originalText) ||
      this.buildFallbackIngredient(originalText);


    return parsed;
  }

  /**
   * Normalize parsed ingredient response from Mealie's parser
   * @param {object} parserResponse - Response from parser API
   * @param {string} originalText - Original ingredient text
   * @returns {object|null} Normalized ingredient or null
   */
  normalizeParsedIngredient(parserResponse, originalText) {
    const candidate = this.extractParserCandidate(parserResponse);
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const quantityValue =
      candidate.quantity ?? candidate.amount ?? candidate.value ?? '';
    const unitValue =
      candidate.unit ?? candidate.units ?? candidate.measure ?? '';
    const noteValue = candidate.note ?? candidate.notes ?? '';
    const displayValue =
      candidate.display ?? candidate.originalText ?? originalText;
    const foodName =
      candidate.food?.name ??
      candidate.name ??
      candidate.ingredient ??
      displayValue ??
      originalText;


    return {
      title: candidate.title ?? '',
      note: noteValue || displayValue || originalText,
      unit: typeof unitValue === 'number' ? String(unitValue) : unitValue || '',
      quantity:
        typeof quantityValue === 'number'
          ? String(quantityValue)
          : quantityValue || '',
      food: {
        name: String(foodName || originalText).trim() || originalText,
        id: candidate.food?.id ? String(candidate.food.id) : undefined
      },
      disableAmount: Boolean(
        candidate.disableAmount ?? candidate.disable_amount ?? false
      ),
      display: displayValue || originalText
    };
  }

  /**
   * Extract the ingredient candidate from parser response
   * @param {object|Array} parserResponse - Parser response
   * @returns {object|null} Candidate ingredient object
   */
  extractParserCandidate(parserResponse) {
    if (!parserResponse) {
      return null;
    }

    if (Array.isArray(parserResponse)) {
      return parserResponse[0] || null;
    }

    if (typeof parserResponse !== 'object') {
      return null;
    }

    const candidateKeys = [
      'ingredient',
      'result',
      'data',
      'parsed',
      'items',
      'ingredients'
    ];

    for (const key of candidateKeys) {
      const value = parserResponse[key];

      if (Array.isArray(value) && value.length) {
        return value[0];
      }

      if (value && typeof value === 'object') {
        return value;
      }
    }

    return parserResponse;
  }

  /**
   * Build a fallback ingredient when parsing fails
   * @param {string} originalText - Original ingredient text
   * @returns {object} Fallback ingredient object
   */
  buildFallbackIngredient(originalText) {
    const text = String(originalText || '').trim();
    const fallbackName = text || 'Ingredient';

    return {
      title: '',
      note: text,
      unit: '',
      quantity: '',
      food: {
        name: fallbackName
      },
      disableAmount: true,
      display: text
    };
  }

  /**
   * Extract meal type from recipe keywords or description
   * @param {object} recipe - Recipe object
   * @returns {string} Meal type (breakfast, lunch, dinner, snack)
   */
  extractMealType(recipe) {
    const keywords = recipe?.keywords;
    if (typeof keywords === 'string') {
      const keywordsLower = keywords.toLowerCase();
      for (const [hungarian, english] of Object.entries(MEAL_TYPE_MAP)) {
        if (keywordsLower.includes(hungarian)) {
          return english;
        }
      }
    }

    const description =
      typeof recipe?.description === 'string'
        ? recipe.description.toLowerCase()
        : '';
    for (const [hungarian, english] of Object.entries(MEAL_TYPE_MAP)) {
      if (description.includes(hungarian)) {
        return english;
      }
    }

    return 'dinner';
  }

  /**
   * Convert JSON-LD recipe to Mealie format
   * @param {object} recipe - JSON-LD recipe object
   * @returns {Promise<object>} Mealie-formatted recipe
   */
  async convertRecipeToMealieFormat(recipe) {
    const ingredientTexts = Array.isArray(recipe?.recipeIngredient)
      ? recipe.recipeIngredient
      : [];

    console.log(`  Processing ${ingredientTexts.length} ingredients...`);
    const ingredients = [];
    let amountableFields = {
      disableAmount: false,
    };

    for (const ingredientText of ingredientTexts) {
      const parsed = await this.parseIngredientText(String(ingredientText));

      if (parsed.unit.id === null) {
        amountableFields.disableAmount =true;
      } else {
        amountableFields.unit = parsed?.unit;
      }

      const ingredientEntry = {
        ...amountableFields,
        reference_id: randomUUID(),
        title: parsed?.title ?? '',
        note: parsed?.note ?? '',
        quantity: parsed?.quantity ?? '',
        food: parsed?.food ?? '',
        display:
          parsed?.display || String(ingredientText).trim() || 'Ingredient'
      };

      if (!ingredientEntry.food.id) {
        const newIngredient = await this.api.createIngredient(ingredientEntry.food.name);
       ingredientEntry.food.id = newIngredient.id;
      }

      ingredients.push(ingredientEntry);
    }

    const instructionsSource = Array.isArray(recipe?.recipeInstructions)
      ? recipe.recipeInstructions
      : [];
    const instructions = instructionsSource.map((instruction, index) => {
      let text = '';
      if (instruction && typeof instruction === 'object') {
        text = instruction.text || '';
      } else {
        text = String(instruction);
      }

      return {
        ingredientReferences: [],
        text
      };
    });

    const nutritionData =
      recipe && typeof recipe === 'object' ? recipe.nutrition || {} : {};

    const tags = [];
    const tag = await this.api.getTagByName(recipe.keywords) ?? null;
    if (tag) {
      tags.push(tag);
    }

    const mealieRecipe = {
      name: recipe?.name || 'Untitled Recipe',
      description: recipe?.description || '',
      recipeYield: recipe?.recipeYield || '1',
      recipeIngredient: ingredients,
      recipeInstructions: instructions,
      notes: [],
      tags: tags,
      settings: {
        public: true,
        showNutrition: true,
        showAssets: true,
        landscapeView: false,
        disableComments: false,
        disableAmount: false
      }
    };

    if (nutritionData && typeof nutritionData === 'object') {
      mealieRecipe.nutrition = {
        calories: nutritionData.calories || '',
        protein: nutritionData.proteinContent || '',
        fatContent: nutritionData.fatContent || '',
        carbohydrateContent: nutritionData.carbohydrateContent || ''
      };
    }

    return mealieRecipe;
  }

  /**
   * Create a recipe if it doesn't already exist
   * @param {object} recipe - Recipe data
   * @returns {Promise<object|null>} Created or existing recipe
   */
  async createRecipeIfNotExists(recipe) {
    const recipeName = recipe?.name || 'Untitled Recipe';
    const existingRecipe = await this.api.getRecipeByName(recipeName);

    if (existingRecipe) {
      console.log(
        `✓ Recipe '${recipeName}' already exists (ID: ${existingRecipe.id || existingRecipe.slug})`
      );
      return existingRecipe;
    }

    console.log(`+ Creating recipe '${recipeName}'`);
    const mealieRecipe = await this.convertRecipeToMealieFormat(recipe);

    const slug = await this.api.createRecipe({ name: mealieRecipe.name });
    const createdRecipe = await this.api.updateRecipe(slug, mealieRecipe);

    if (createdRecipe) {
      console.log(
        `  ✓ Recipe created successfully (ID: ${createdRecipe.id || createdRecipe.slug})`
      );
    }

    return createdRecipe;
  }

  /**
   * Calculate dates for a specific week
   * @param {number} year - Year
   * @param {number} week - ISO week number
   * @returns {object} Object mapping day names to ISO date strings
   */
  calculateWeekDates(year, week) {
    const weekNumber = Number.isFinite(Number(week)) ? Number(week) : 1;
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Weekday = jan4.getUTCDay();
    const mondayOffset = (jan4Weekday + 6) % 7;

    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - mondayOffset);

    const targetMonday = new Date(week1Monday);
    targetMonday.setUTCDate(
      week1Monday.getUTCDate() + (Math.max(weekNumber, 1) - 1) * 7
    );

    const dates = {};
    DAY_ORDER.forEach((day, index) => {
      const currentDate = new Date(targetMonday);
      currentDate.setUTCDate(targetMonday.getUTCDate() + index);
      dates[day] = currentDate.toISOString().slice(0, 10);
    });

    return dates;
  }

  /**
   * Process a weekly menu and create recipes and meal plans
   * @param {object} menuData - Menu data with recipes for each day
   * @param {number} [year=2025] - Year for the menu
   */
  async processWeeklyMenu(menuData, year = 2025) {
    const weekNumber = Number(menuData?.week) || 1;
    console.log('\n============================================================');
    console.log(`Processing Week ${weekNumber} Menu`);
    console.log('============================================================\n');

    const weekDates = this.calculateWeekDates(year, weekNumber);

    for (const day of DAY_ORDER) {
      const recipes = Array.isArray(menuData?.[day]) ? menuData[day] : [];

      if (!recipes.length) {
        console.log(`\n${day.charAt(0).toUpperCase() + day.slice(1)}: No recipes`);
        continue;
      }

      console.log(`\n${day.charAt(0).toUpperCase() + day.slice(1)} (${weekDates[day]}):`);
      console.log('----------------------------------------');

      for (const recipe of recipes) {
        const createdRecipe = await this.createRecipeIfNotExists(recipe);

        if (!createdRecipe) {
          continue;
        }

        const mealType = this.extractMealType(recipe);
        console.log(`  Meal type: ${mealType}`);

        const recipeId = createdRecipe.id || createdRecipe.slug;
        if (!recipeId) {
          console.log('  ✗ Unable to determine recipe ID for meal plan entry');
          continue;
        }

        console.log(`  Adding to meal plan for ${weekDates[day]}...`);
        const mealplan = await this.api.createMealplan(
          weekDates[day],
          mealType,
          recipeId
        );

        if (mealplan) {
          console.log('  ✓ Meal plan entry created');
        } else {
          console.log('  ✗ Failed to create meal plan entry');
        }
      }
    }

    console.log('\n============================================================');
    console.log(`Week ${weekNumber} processing complete!`);
    console.log('============================================================\n');
  }
}

module.exports = MealieMenuCreator;

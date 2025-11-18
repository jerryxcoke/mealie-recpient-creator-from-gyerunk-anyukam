#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs/promises');
const dotenv = require('dotenv');

function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error(
      'The Fetch API is not available in this version of Node.js. Please use Node 18 or newer.'
    );
  }
}

function loadEnvFileFromDisk(envFile = '.env') {
  const envPath = path.resolve(process.cwd(), envFile);
  const result = dotenv.config({ path: envPath, override: false });

  if (result.error) {
    if (result.error.code !== 'ENOENT') {
      console.warn(`Warning: Unable to load ${envFile}: ${result.error.message}`);
    }
    return false;
  }

  return Boolean(result.parsed);
}

class MealieConfig {
  constructor(baseUrl, apiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiToken = apiToken;
  }

  static fromEnv() {
    const baseUrl = process.env.MEALIE_BASE_URL || 'http://localhost:9000';
    const apiToken = process.env.MEALIE_API_TOKEN || '';

    if (!apiToken) {
      throw new Error('MEALIE_API_TOKEN environment variable is required');
    }

    return new MealieConfig(baseUrl, apiToken);
  }
}

class MealieAPI {
  constructor(config) {
    this.config = config;
  }

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

    async searchIngredients(query) {
      const searchParams = new URLSearchParams();
      if (query) {
        searchParams.set('search', query);
      }
      searchParams.set('perPage', '100');
      try {
        const response = await this.request(
          'GET',
          `/foods?${searchParams.toString()}`
        );
        return await response.json();
      } catch (error) {
        console.error(`Error fetching ingredients: ${error.message}`);
        return { items: [] };
      }
    }

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

    async getIngredientByName(name) {
      const normalized = typeof name === 'string' ? name.toLowerCase().trim() : '';
      if (!normalized) {
        return null;
      }

      const searchResult = await this.searchIngredients(name);
      const candidates = Array.isArray(searchResult?.items)
        ? searchResult.items
        : Array.isArray(searchResult)
          ? searchResult
          : [];

      return (
        candidates.find(
          (ingredient) =>
            typeof ingredient?.name === 'string' &&
            ingredient.name.toLowerCase().trim() === normalized
        ) || null
      );
    }

  async ensureIngredientExists(name) {
    const ingredient = await this.getIngredientByName(name);

    if (ingredient) {
      console.log(`  ✓ Ingredient '${name}' already exists`);
      return ingredient;
    }

    console.log(`  + Creating ingredient '${name}'`);
    return this.createIngredient(name);
  }

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

    async createRecipe(recipeData, options = {}) {
      const includeTags = Boolean(options.includeTags);
      const payloadData =
        typeof recipeData === 'string'
          ? recipeData
          : JSON.stringify(recipeData);
    try {
        const response = await this.request(
          'POST',
          '/recipes/create/html-or-json',
          {
            data: payloadData,
            includeTags
          }
        );
      return await response.json();
    } catch (error) {
      console.error(`Error creating recipe: ${error.message}`);
      if (error.responseText) {
        console.error(`Response: ${error.responseText}`);
      }
      return null;
    }
  }

    async getRecipeBySlug(slug) {
      const identifier = String(slug || '').trim();
      if (!identifier) {
        return null;
      }

      try {
        const response = await this.request('GET', `/recipes/${identifier}`);
        return await response.json();
      } catch (error) {
        console.error(`Error fetching recipe '${identifier}': ${error.message}`);
        return null;
      }
    }

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

class MealieMenuCreator {
  constructor(api) {
    this.api = api;
  }

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
        name: String(foodName || originalText).trim() || originalText
      },
      disableAmount: Boolean(
        candidate.disableAmount ?? candidate.disable_amount ?? false
      ),
      display: displayValue || originalText
    };
  }

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

  extractMealType(recipe) {
    const keywords = recipe?.keywords;
    if (typeof keywords === 'string') {
      const keywordsLower = keywords.toLowerCase();
      for (const [hungarian, english] of Object.entries(
        MealieMenuCreator.MEAL_TYPE_MAP
      )) {
        if (keywordsLower.includes(hungarian)) {
          return english;
        }
      }
    }

    const description =
      typeof recipe?.description === 'string'
        ? recipe.description.toLowerCase()
        : '';
    for (const [hungarian, english] of Object.entries(
      MealieMenuCreator.MEAL_TYPE_MAP
    )) {
      if (description.includes(hungarian)) {
        return english;
      }
    }

    return 'dinner';
  }

  async convertRecipeToMealieFormat(recipe) {
    const ingredientTexts = Array.isArray(recipe?.recipeIngredient)
      ? recipe.recipeIngredient
      : [];

    console.log(`  Processing ${ingredientTexts.length} ingredients...`);
    const ingredients = [];

    for (const ingredientText of ingredientTexts) {
      const parsed = await this.parseIngredientText(String(ingredientText));

      const ingredientEntry = {
        title: parsed?.title ?? '',
        note: parsed?.note ?? '',
        unit: parsed?.unit ?? '',
        quantity: parsed?.quantity ?? '',
        food: {
          name:
            parsed?.food?.name ||
            parsed?.display ||
            String(ingredientText).trim() ||
            'Ingredient'
        },
        disableAmount: false,
        display:
          parsed?.display || String(ingredientText).trim() || 'Ingredient'
      };

      console.log(555, ingredientEntry);

      await this.api.ensureIngredientExists(ingredientEntry.food.name);
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
        id: String(index),
        title: '',
        text
      };
    });

    const nutritionData =
      recipe && typeof recipe === 'object' ? recipe.nutrition || {} : {};

    const mealieRecipe = {
      name: recipe?.name || 'Untitled Recipe',
      description: recipe?.description || '',
      recipeYield: recipe?.recipeYield || '1',
      recipeIngredient: ingredients,
      recipeInstructions: instructions,
      notes: [],
      tags: [],
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

    console.log(mealieRecipe);
    const createdRecipe = await this.api.createRecipe(mealieRecipe);

    if (createdRecipe) {
      console.log(
        `  ✓ Recipe created successfully (ID: ${createdRecipe.id || createdRecipe.slug})`
      );
    }

    return createdRecipe;
  }

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
    MealieMenuCreator.DAY_ORDER.forEach((day, index) => {
      const currentDate = new Date(targetMonday);
      currentDate.setUTCDate(targetMonday.getUTCDate() + index);
      dates[day] = currentDate.toISOString().slice(0, 10);
    });

    return dates;
  }

  async processWeeklyMenu(menuData, year = 2025) {
    const weekNumber = Number(menuData?.week) || 1;
    console.log('\n============================================================');
    console.log(`Processing Week ${weekNumber} Menu`);
    console.log('============================================================\n');

    const weekDates = this.calculateWeekDates(year, weekNumber);

    for (const day of MealieMenuCreator.DAY_ORDER) {
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

MealieMenuCreator.MEAL_TYPE_MAP = {
  reggeli: 'breakfast',
  ebéd: 'lunch',
  ebed: 'lunch',
  vacsora: 'dinner',
  snack: 'snack',
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner'
};

MealieMenuCreator.DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

function printEnvInstructions() {
  console.log('\nPlease set the following environment variables:');
  console.log(
    '  MEALIE_BASE_URL - Your Mealie instance URL (default: http://localhost:9000)'
  );
  console.log('  MEALIE_API_TOKEN - Your Mealie API token (required)\n');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

async function loadMenuData(jsonPathArg) {
  if (jsonPathArg) {
    const resolvedPath = path.resolve(process.cwd(), jsonPathArg);
    const fileContents = await fs.readFile(resolvedPath, 'utf8');
    try {
      return JSON.parse(fileContents);
    } catch (error) {
      throw new Error(`Invalid JSON in file '${resolvedPath}': ${error.message}`);
    }
  }

  console.log('Reading menu JSON from stdin (or provide filename as argument)...');
  console.log('Enter JSON data and press Ctrl+D when done:\n');
  const input = await readStdin();

  if (!input.trim()) {
    throw new Error('No JSON input received from stdin');
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON from stdin: ${error.message}`);
  }
}

async function main() {
  try {
    ensureFetchAvailable();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  const envLoaded = loadEnvFileFromDisk();
  if (envLoaded) {
    console.log('Loaded environment variables from .env');
  }

  let config;
  try {
    config = MealieConfig.fromEnv();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    printEnvInstructions();
    process.exit(1);
  }

  const jsonArg = process.argv[2];
  let menuData;

  try {
    menuData = await loadMenuData(jsonArg);
  } catch (error) {
    console.error(`Error loading menu data: ${error.message}`);
    process.exit(1);
  }

  const api = new MealieAPI(config);
  const creator = new MealieMenuCreator(api);

  await creator.processWeeklyMenu(menuData);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Unexpected error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}


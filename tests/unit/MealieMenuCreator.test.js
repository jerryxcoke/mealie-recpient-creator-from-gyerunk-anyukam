'use strict';

const MealieMenuCreator = require('../../src/services/MealieMenuCreator');
const { sampleRecipe, sampleMenuData } = require('../fixtures/sampleMenuData');

describe('MealieMenuCreator', () => {
  let creator;
  let mockApi;

  beforeEach(() => {
    // Mock API with all required methods
    mockApi = {
      parseIngredient: jest.fn(),
      ensureIngredientExists: jest.fn(),
      getTagByName: jest.fn(),
      getRecipeByName: jest.fn(),
      createRecipe: jest.fn(),
      updateRecipe: jest.fn(),
      createMealplan: jest.fn()
    };

    creator = new MealieMenuCreator(mockApi);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildFallbackIngredient', () => {
    test('should create fallback ingredient with text', () => {
      const result = creator.buildFallbackIngredient('100g flour');

      expect(result).toEqual({
        title: '',
        note: '100g flour',
        unit: '',
        quantity: '',
        food: { name: '100g flour' },
        disableAmount: true,
        display: '100g flour'
      });
    });

    test('should handle empty text', () => {
      const result = creator.buildFallbackIngredient('');

      expect(result.food.name).toBe('Ingredient');
      expect(result.disableAmount).toBe(true);
    });
  });

  describe('extractParserCandidate', () => {
    test('should return first element if response is array', () => {
      const response = [{ name: 'flour' }, { name: 'sugar' }];
      const result = creator.extractParserCandidate(response);

      expect(result).toEqual({ name: 'flour' });
    });

    test('should return null for empty array', () => {
      const result = creator.extractParserCandidate([]);

      expect(result).toBeNull();
    });

    test('should return response directly if it is an object', () => {
      const response = { quantity: '100', unit: 'g' };
      const result = creator.extractParserCandidate(response);

      expect(result).toEqual(response);
    });

    test('should extract from known keys', () => {
      const response = {
        ingredient: { name: 'flour' }
      };
      const result = creator.extractParserCandidate(response);

      expect(result).toEqual({ name: 'flour' });
    });

    test('should handle nested array in result key', () => {
      const response = {
        result: [{ name: 'sugar' }]
      };
      const result = creator.extractParserCandidate(response);

      expect(result).toEqual({ name: 'sugar' });
    });

    test('should return null for null response', () => {
      const result = creator.extractParserCandidate(null);

      expect(result).toBeNull();
    });
  });

  describe('normalizeParsedIngredient', () => {
    test('should normalize valid parsed ingredient', () => {
      const parsed = {
        quantity: 100,
        unit: 'g',
        food: { name: 'flour', id: 'flour-123' },
        note: 'sifted',
        display: '100g flour, sifted'
      };

      const result = creator.normalizeParsedIngredient(parsed, '100g flour');

      expect(result).toEqual({
        title: '',
        note: 'sifted',
        unit: 'g',
        quantity: '100',
        food: { name: 'flour', id: 'flour-123' },
        disableAmount: false,
        display: '100g flour, sifted'
      });
    });

    test('should convert numeric values to strings', () => {
      const parsed = {
        quantity: 2,
        unit: 5,
        food: { name: 'eggs', id: 'egg-123' }
      };

      const result = creator.normalizeParsedIngredient(parsed, '2 eggs');

      expect(typeof result.quantity).toBe('string');
      expect(typeof result.unit).toBe('string');
      expect(result.quantity).toBe('2');
      expect(result.unit).toBe('5');
    });

    test('should handle missing food object', () => {
      const parsed = {
        name: 'milk'
      };

      const result = creator.normalizeParsedIngredient(parsed, 'milk');

      expect(result.food.name).toBe('milk');
    });

    test('should return null for invalid candidate', () => {
      const result = creator.normalizeParsedIngredient(null, 'test');

      expect(result).toBeNull();
    });

    test('should use originalText as fallback for display', () => {
      const parsed = {
        food: { name: 'salt', id: 'salt-123' }
      };

      const result = creator.normalizeParsedIngredient(parsed, 'a pinch of salt');

      expect(result.display).toBe('a pinch of salt');
    });
  });

  describe('parseIngredientText', () => {
    test('should parse ingredient using API', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApi.parseIngredient.mockResolvedValue({
        quantity: '100',
        unit: 'g',
        food: { name: 'flour', id: 'flour-123' }
      });

      const result = await creator.parseIngredientText('100g flour');

      expect(mockApi.parseIngredient).toHaveBeenCalledWith('100g flour');
      expect(result.food.name).toBe('flour');
      
      consoleLogSpy.mockRestore();
    });

    test('should return fallback for empty text', async () => {
      const result = await creator.parseIngredientText('');

      expect(result.disableAmount).toBe(true);
      expect(mockApi.parseIngredient).not.toHaveBeenCalled();
    });

    test('should use fallback if parsing fails', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApi.parseIngredient.mockResolvedValue(null);

      const result = await creator.parseIngredientText('unknown ingredient');

      expect(result.food.name).toBe('unknown ingredient');
      expect(result.disableAmount).toBe(true);
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('extractMealType', () => {
    test('should extract meal type from keywords', () => {
      const recipe = { keywords: 'reggeli' };
      const result = creator.extractMealType(recipe);

      expect(result).toBe('breakfast');
    });

    test('should extract meal type from description', () => {
      const recipe = { description: 'A delicious ebéd recipe' };
      const result = creator.extractMealType(recipe);

      expect(result).toBe('lunch');
    });

    test('should be case-insensitive', () => {
      const recipe = { keywords: 'VACSORA' };
      const result = creator.extractMealType(recipe);

      expect(result).toBe('dinner');
    });

    test('should default to dinner if no match', () => {
      const recipe = { keywords: 'unknown' };
      const result = creator.extractMealType(recipe);

      expect(result).toBe('dinner');
    });

    test('should handle missing keywords and description', () => {
      const recipe = {};
      const result = creator.extractMealType(recipe);

      expect(result).toBe('dinner');
    });
  });

  describe('calculateWeekDates', () => {
    test('should calculate dates for week 1', () => {
      const dates = creator.calculateWeekDates(2025, 1);

      expect(dates.monday).toBe('2024-12-30');
      expect(dates.sunday).toBe('2025-01-05');
    });

    test('should calculate dates for week 26', () => {
      const dates = creator.calculateWeekDates(2025, 26);

      expect(dates.monday).toBe('2025-06-23');
      expect(dates.sunday).toBe('2025-06-29');
    });

    test('should handle invalid week number', () => {
      const dates = creator.calculateWeekDates(2025, 'invalid');

      expect(dates.monday).toBeDefined();
      expect(dates.sunday).toBeDefined();
    });

    test('should return all 7 days', () => {
      const dates = creator.calculateWeekDates(2025, 1);
      const days = Object.keys(dates);

      expect(days).toHaveLength(7);
      expect(days).toContain('monday');
      expect(days).toContain('sunday');
    });

    test('should return dates in ISO format', () => {
      const dates = creator.calculateWeekDates(2025, 10);

      Object.values(dates).forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('convertRecipeToMealieFormat', () => {
    test('should convert recipe with all fields', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApi.parseIngredient.mockResolvedValue({
        quantity: '100',
        unit: 'g',
        food: { name: 'flour', id: 'flour-123' }
      });
      mockApi.ensureIngredientExists.mockResolvedValue({ id: 'flour-123' });
      mockApi.getTagByName.mockResolvedValue({ id: 'tag-1', name: 'breakfast' });

      const result = await creator.convertRecipeToMealieFormat(sampleRecipe);

      expect(result.name).toBe('Pancakes');
      expect(result.description).toBe('Delicious pancakes');
      expect(result.recipeYield).toBe('4 servings');
      expect(result.recipeIngredient).toHaveLength(3);
      expect(result.recipeInstructions).toHaveLength(2);
      expect(result.tags).toHaveLength(1);
      expect(result.nutrition).toBeDefined();
      
      consoleLogSpy.mockRestore();
    });

    test('should handle recipe without ingredients', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const recipe = { name: 'Simple Recipe' };

      const result = await creator.convertRecipeToMealieFormat(recipe);

      expect(result.recipeIngredient).toEqual([]);
      
      consoleLogSpy.mockRestore();
    });

    test('should handle string instructions', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const recipe = {
        name: 'Test',
        recipeInstructions: ['Step 1', 'Step 2']
      };

      const result = await creator.convertRecipeToMealieFormat(recipe);

      expect(result.recipeInstructions[0].text).toBe('Step 1');
      expect(result.recipeInstructions[1].text).toBe('Step 2');
      
      consoleLogSpy.mockRestore();
    });

    test('should set default values for missing fields', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const recipe = {};

      const result = await creator.convertRecipeToMealieFormat(recipe);

      expect(result.name).toBe('Untitled Recipe');
      expect(result.description).toBe('');
      expect(result.recipeYield).toBe('1');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('createRecipeIfNotExists', () => {
    test('should return existing recipe without creating', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const existingRecipe = { id: 'recipe-1', name: 'Test Recipe' };
      mockApi.getRecipeByName.mockResolvedValue(existingRecipe);

      const result = await creator.createRecipeIfNotExists({ name: 'Test Recipe' });

      expect(result).toEqual(existingRecipe);
      expect(mockApi.createRecipe).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );
      
      consoleLogSpy.mockRestore();
    });

    test('should create new recipe if not exists', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApi.getRecipeByName.mockResolvedValue(null);
      mockApi.parseIngredient.mockResolvedValue({
        food: { name: 'flour', id: 'flour-123' }
      });
      mockApi.ensureIngredientExists.mockResolvedValue({ id: 'flour-123' });
      mockApi.getTagByName.mockResolvedValue(null);
      mockApi.createRecipe.mockResolvedValue('new-slug');
      mockApi.updateRecipe.mockResolvedValue({
        id: 'new-recipe',
        slug: 'new-slug',
        name: 'New Recipe'
      });

      const result = await creator.createRecipeIfNotExists(sampleRecipe);

      expect(mockApi.createRecipe).toHaveBeenCalled();
      expect(mockApi.updateRecipe).toHaveBeenCalled();
      expect(result.name).toBe('New Recipe');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('processWeeklyMenu', () => {
    test('should process all days with recipes', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApi.getRecipeByName.mockResolvedValue(null);
      mockApi.parseIngredient.mockResolvedValue({
        food: { name: 'flour', id: 'flour-123' }
      });
      mockApi.ensureIngredientExists.mockResolvedValue({ id: 'flour-123' });
      mockApi.getTagByName.mockResolvedValue(null);
      mockApi.createRecipe.mockResolvedValue('slug-123');
      mockApi.updateRecipe.mockResolvedValue({
        id: 'recipe-123',
        name: 'Test Recipe'
      });
      mockApi.createMealplan.mockResolvedValue({ id: 'plan-123' });

      await creator.processWeeklyMenu(sampleMenuData, 2025);

      expect(mockApi.createMealplan).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Week 26')
      );
      
      consoleLogSpy.mockRestore();
    });

    test('should skip days without recipes', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const menuData = {
        week: 1,
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };

      await creator.processWeeklyMenu(menuData);

      expect(mockApi.createRecipe).not.toHaveBeenCalled();
      expect(mockApi.createMealplan).not.toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    test('should handle recipe creation failure gracefully', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApi.getRecipeByName.mockResolvedValue(null);
      mockApi.parseIngredient.mockResolvedValue({
        food: { name: 'flour', id: 'flour-123' }
      });
      mockApi.ensureIngredientExists.mockResolvedValue({ id: 'flour-123' });
      mockApi.getTagByName.mockResolvedValue(null);
      mockApi.createRecipe.mockResolvedValue(null);

      await creator.processWeeklyMenu(sampleMenuData, 2025);

      expect(mockApi.createMealplan).not.toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    test('should use correct year for date calculation', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockApi.getRecipeByName.mockResolvedValue({
        id: 'existing-recipe'
      });
      mockApi.createMealplan.mockResolvedValue({ id: 'plan-123' });

      await creator.processWeeklyMenu(sampleMenuData, 2024);

      expect(mockApi.createMealplan).toHaveBeenCalledWith(
        expect.stringMatching(/^2024-/),
        expect.any(String),
        expect.any(String)
      );
      
      consoleLogSpy.mockRestore();
    });
  });
});

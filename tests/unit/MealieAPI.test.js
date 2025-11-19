'use strict';

const MealieAPI = require('../../src/api/MealieAPI');
const MealieConfig = require('../../src/config/MealieConfig');

describe('MealieAPI', () => {
  let api;
  let config;
  let mockFetch;

  beforeEach(() => {
    config = new MealieConfig('http://test.com', 'test-token');
    api = new MealieAPI(config);
    
    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  describe('request', () => {
    test('should make GET request with correct headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await api.request('GET', '/test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test.com/api/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('should make POST request with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1 })
      });

      const body = { name: 'Test' };
      await api.request('POST', '/recipes', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test.com/api/recipes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
    });

    test('should throw error on failed request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Error details'
      });

      await expect(api.request('GET', '/invalid')).rejects.toThrow(
        'Request failed with status 404'
      );
    });

    test('should include error response text in error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Validation error'
      });

      try {
        await api.request('POST', '/recipes', {});
      } catch (error) {
        expect(error.responseText).toBe('Validation error');
        expect(error.status).toBe(400);
      }
    });
  });

  describe('searchIngredients', () => {
    test('should search for ingredients', async () => {
      const mockIngredients ={items:[{ id: 1, name: 'flour' }]};
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockIngredients
      });

      const result = await api.searchIngredients('flour');

      expect(result).toEqual(mockIngredients);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/foods?search=flour'),
        expect.any(Object)
      );
    });

    test('should return empty array on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.searchIngredients('flour');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createIngredient', () => {
    test('should create ingredient with correct data', async () => {
      const mockIngredient = { id: 'new-id', name: 'sugar' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockIngredient
      });

      const result = await api.createIngredient('sugar');

      expect(result).toEqual(mockIngredient);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/foods'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('sugar')
        })
      );
    });

    test('should return null on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValue(new Error('Creation failed'));

      const result = await api.createIngredient('invalid');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('parseIngredient', () => {
    test('should parse ingredient text successfully', async () => {
      const mockParsed = { quantity: '100', unit: 'g', food: { name: 'flour' } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockParsed
      });

      const result = await api.parseIngredient('100g flour');

      expect(result).toEqual(mockParsed);
    });

    test('should return null for empty text', async () => {
      const result = await api.parseIngredient('');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should try multiple payload variants on 4xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          text: async () => 'Bad format'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ parsed: true })
        });

      const result = await api.parseIngredient('100g flour');

      expect(result).toEqual({ parsed: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should not retry on 401 or 403 errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Auth failed'
      });

      const result = await api.parseIngredient('100g flour');

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getRecipes', () => {
    test('should return array of recipes', async () => {
      const mockRecipes = [{ id: 1, name: 'Recipe 1' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipes
      });

      const result = await api.getRecipes();

      expect(result).toEqual(mockRecipes);
    });

    test('should handle paginated response with items', async () => {
      const mockRecipes = [{ id: 1, name: 'Recipe 1' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockRecipes, total: 1 })
      });

      const result = await api.getRecipes();

      expect(result).toEqual(mockRecipes);
    });

    test('should return empty array on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      const result = await api.getRecipes();

      expect(result).toEqual([]);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getRecipeByName', () => {
    test('should find recipe by exact name match', async () => {
      const mockRecipes = [
        { id: 1, name: 'Pancakes' },
        { id: 2, name: 'Waffles' }
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipes
      });

      const result = await api.getRecipeByName('Pancakes');

      expect(result).toEqual({ id: 1, name: 'Pancakes' });
    });

    test('should be case-insensitive', async () => {
      const mockRecipes = [{ id: 1, name: 'Pancakes' }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipes
      });

      const result = await api.getRecipeByName('pancakes');

      expect(result).toEqual({ id: 1, name: 'Pancakes' });
    });

    test('should return null if recipe not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      const result = await api.getRecipeByName('Nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createRecipe', () => {
    test('should create recipe successfully', async () => {
      const mockRecipe = { id: 'new-recipe', name: 'New Recipe' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipe
      });

      const result = await api.createRecipe({ name: 'New Recipe' });

      expect(result).toEqual(mockRecipe);
    });

    test('should return null on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValue(new Error('Creation failed'));

      const result = await api.createRecipe({ name: 'Invalid' });

      expect(result).toBeNull();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateRecipe', () => {
    test('should update recipe successfully', async () => {
      const mockRecipe = { id: 'recipe-1', name: 'Updated Recipe' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRecipe
      });

      const result = await api.updateRecipe('recipe-1', { name: 'Updated Recipe' });

      expect(result).toEqual(mockRecipe);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/recipe-1'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('createMealplan', () => {
    test('should create meal plan entry', async () => {
      const mockMealplan = { id: 'plan-1', date: '2025-01-01' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMealplan
      });

      const result = await api.createMealplan('2025-01-01', 'breakfast', 'recipe-1');

      expect(result).toEqual(mockMealplan);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/groups/mealplans'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('2025-01-01')
        })
      );
    });

    test('should return null on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValue(new Error('Creation failed'));

      const result = await api.createMealplan('2025-01-01', 'lunch', 'recipe-1');

      expect(result).toBeNull();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getTagByName', () => {
    test('should return first matching tag', async () => {
      const mockTags = { items: [{ id: 1, name: 'breakfast' }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTags
      });

      const result = await api.getTagByName('breakfast');

      expect(result).toEqual({ id: 1, name: 'breakfast' });
    });

    test('should return empty array on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      const result = await api.getTagByName('test');

      expect(result).toEqual([]);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('ensureIngredientExists', () => {
    test('should return existing ingredient without creating', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockIngredient = {items:[{ id: 1, name: 'flour' }]};
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockIngredient
      });

      const result = await api.ensureIngredientExists('flour');

      expect(result).toEqual(mockIngredient);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );
      
      consoleLogSpy.mockRestore();
    });

    test('should create ingredient if not found', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockNewIngredient = {items:[{ id: 1, name: 'sugar' }]};
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {items:[]}
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNewIngredient
        });

      const result = await api.ensureIngredientExists('sugar');

      expect(result).toEqual(mockNewIngredient);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating ingredient')
      );
      
      consoleLogSpy.mockRestore();
    });
  });
});

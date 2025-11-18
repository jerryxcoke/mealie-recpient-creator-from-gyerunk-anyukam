'use strict';

const MealieConfig = require('../../src/config/MealieConfig');

describe('MealieConfig', () => {
  describe('constructor', () => {
    test('should create config with provided values', () => {
      const config = new MealieConfig('http://example.com', 'test-token');
      
      expect(config.baseUrl).toBe('http://example.com');
      expect(config.apiToken).toBe('test-token');
    });

    test('should remove trailing slash from baseUrl', () => {
      const config = new MealieConfig('http://example.com/', 'test-token');
      
      expect(config.baseUrl).toBe('http://example.com');
    });

    test('should handle multiple trailing slashes', () => {
      const config = new MealieConfig('http://example.com///', 'test-token');
      
      expect(config.baseUrl).toBe('http://example.com//');
    });
  });

  describe('fromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should create config from environment variables', () => {
      process.env.MEALIE_BASE_URL = 'http://test.com';
      process.env.MEALIE_API_TOKEN = 'my-token';

      const config = MealieConfig.fromEnv();

      expect(config.baseUrl).toBe('http://test.com');
      expect(config.apiToken).toBe('my-token');
    });

    test('should use default base URL if not provided', () => {
      process.env.MEALIE_API_TOKEN = 'my-token';
      delete process.env.MEALIE_BASE_URL;

      const config = MealieConfig.fromEnv();

      expect(config.baseUrl).toBe('http://localhost:9000');
      expect(config.apiToken).toBe('my-token');
    });

    test('should throw error if API token is not provided', () => {
      delete process.env.MEALIE_API_TOKEN;

      expect(() => {
        MealieConfig.fromEnv();
      }).toThrow('MEALIE_API_TOKEN environment variable is required');
    });

    test('should throw error if API token is empty string', () => {
      process.env.MEALIE_API_TOKEN = '';

      expect(() => {
        MealieConfig.fromEnv();
      }).toThrow('MEALIE_API_TOKEN environment variable is required');
    });
  });
});

'use strict';

const fs = require('fs/promises');
const path = require('path');
const { loadMenuData } = require('../../../src/utils/io');

// Mock fs/promises
jest.mock('fs/promises');

describe('io utilities', () => {
  describe('loadMenuData', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should load and parse JSON from file', async () => {
      const testData = { week: 1, monday: [] };
      fs.readFile.mockResolvedValue(JSON.stringify(testData));

      const result = await loadMenuData('test.json');

      expect(result).toEqual(testData);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(process.cwd(), 'test.json'),
        'utf8'
      );
    });

    test('should throw error for invalid JSON in file', async () => {
      fs.readFile.mockResolvedValue('{ invalid json }');

      await expect(loadMenuData('test.json')).rejects.toThrow('Invalid JSON');
    });

    test('should throw error if file cannot be read', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(loadMenuData('nonexistent.json')).rejects.toThrow();
    });

    test('should resolve absolute path correctly', async () => {
      const testData = { week: 1 };
      fs.readFile.mockResolvedValue(JSON.stringify(testData));

      await loadMenuData('/absolute/path/test.json');

      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(process.cwd(), '/absolute/path/test.json'),
        'utf8'
      );
    });
  });
});

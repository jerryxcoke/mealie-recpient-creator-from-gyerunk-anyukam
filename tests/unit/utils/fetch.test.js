'use strict';

const { ensureFetchAvailable } = require('../../../src/utils/fetch');

describe('fetch utilities', () => {
  describe('ensureFetchAvailable', () => {
    test('should not throw error if fetch is available', () => {
      // Mock fetch as available
      global.fetch = jest.fn();

      expect(() => {
        ensureFetchAvailable();
      }).not.toThrow();

      delete global.fetch;
    });

    test('should throw error if fetch is not available', () => {
      // Ensure fetch is not available
      const originalFetch = global.fetch;
      delete global.fetch;

      expect(() => {
        ensureFetchAvailable();
      }).toThrow('The Fetch API is not available');

      global.fetch = originalFetch;
    });

    test('should throw error with helpful message', () => {
      const originalFetch = global.fetch;
      delete global.fetch;

      expect(() => {
        ensureFetchAvailable();
      }).toThrow('Please use Node 18 or newer');

      global.fetch = originalFetch;
    });
  });
});

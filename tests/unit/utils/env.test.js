'use strict';

const { printEnvInstructions } = require('../../../src/utils/env');

describe('env utilities', () => {
  describe('printEnvInstructions', () => {
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    test('should print environment variable instructions', () => {
      printEnvInstructions();

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls.some(call => 
        call[0].includes('MEALIE_BASE_URL')
      )).toBe(true);
      expect(consoleLogSpy.mock.calls.some(call => 
        call[0].includes('MEALIE_API_TOKEN')
      )).toBe(true);
    });

    test('should mention that API token is required', () => {
      printEnvInstructions();

      const allOutput = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');
      expect(allOutput).toMatch(/required/i);
    });

    test('should mention default URL', () => {
      printEnvInstructions();

      const allOutput = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');
      expect(allOutput).toContain('localhost:9000');
    });
  });
});

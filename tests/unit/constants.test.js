'use strict';

const { MEAL_TYPE_MAP, DAY_ORDER } = require('../../src/constants');

describe('Constants', () => {
  describe('MEAL_TYPE_MAP', () => {
    test('should contain Hungarian to English meal type mappings', () => {
      expect(MEAL_TYPE_MAP.reggeli).toBe('breakfast');
      expect(MEAL_TYPE_MAP.ebéd).toBe('lunch');
      expect(MEAL_TYPE_MAP.ebed).toBe('lunch');
      expect(MEAL_TYPE_MAP.vacsora).toBe('dinner');
    });

    test('should contain English meal types', () => {
      expect(MEAL_TYPE_MAP.breakfast).toBe('breakfast');
      expect(MEAL_TYPE_MAP.lunch).toBe('lunch');
      expect(MEAL_TYPE_MAP.dinner).toBe('dinner');
      expect(MEAL_TYPE_MAP.snack).toBe('snack');
    });

    test('should have all values be valid meal types', () => {
      const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      Object.values(MEAL_TYPE_MAP).forEach(value => {
        expect(validTypes).toContain(value);
      });
    });
  });

  describe('DAY_ORDER', () => {
    test('should contain 7 days', () => {
      expect(DAY_ORDER).toHaveLength(7);
    });

    test('should start with Monday', () => {
      expect(DAY_ORDER[0]).toBe('monday');
    });

    test('should end with Sunday', () => {
      expect(DAY_ORDER[6]).toBe('sunday');
    });

    test('should have all days in correct order', () => {
      expect(DAY_ORDER).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      ]);
    });
  });
});

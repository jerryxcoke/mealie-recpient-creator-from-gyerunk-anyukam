'use strict';

/**
 * Mapping of Hungarian meal type keywords to Mealie meal types
 */
const MEAL_TYPE_MAP = {
  reggeli: 'breakfast',
  ebéd: 'lunch',
  ebed: 'lunch',
  vacsora: 'dinner',
  snack: 'snack',
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner'
};

/**
 * Days of the week in order (Monday first, per ISO 8601)
 */
const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

module.exports = {
  MEAL_TYPE_MAP,
  DAY_ORDER
};

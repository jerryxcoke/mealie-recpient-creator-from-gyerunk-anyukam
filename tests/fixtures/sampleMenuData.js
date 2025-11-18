'use strict';

/**
 * Sample menu data for testing
 */
const sampleMenuData = {
  week: 26,
  monday: [
    {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Test Recipe',
      description: 'A test recipe for breakfast',
      recipeYield: '2 servings',
      recipeIngredient: [
        '100g flour',
        '2 eggs',
        '200ml milk'
      ],
      recipeInstructions: [
        {
          '@type': 'HowToStep',
          text: 'Mix flour and eggs'
        },
        {
          '@type': 'HowToStep',
          text: 'Add milk and stir'
        }
      ],
      nutrition: {
        '@type': 'NutritionInformation',
        calories: '300 kcal',
        proteinContent: '15 g',
        fatContent: '10 g',
        carbohydrateContent: '40 g'
      },
      keywords: 'reggeli'
    }
  ],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
};

const sampleRecipe = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Pancakes',
  description: 'Delicious pancakes',
  recipeYield: '4 servings',
  recipeIngredient: ['200g flour', '3 eggs', '300ml milk'],
  recipeInstructions: [
    { '@type': 'HowToStep', text: 'Mix ingredients' },
    { '@type': 'HowToStep', text: 'Cook on pan' }
  ],
  nutrition: {
    calories: '250 kcal',
    proteinContent: '12 g',
    fatContent: '8 g',
    carbohydrateContent: '35 g'
  },
  keywords: 'breakfast'
};

const sampleParsedIngredient = {
  ingredient: {
    quantity: '100',
    unit: 'g',
    food: {
      name: 'flour',
      id: 'flour-id-123'
    },
    note: '',
    display: '100g flour'
  }
};

module.exports = {
  sampleMenuData,
  sampleRecipe,
  sampleParsedIngredient
};

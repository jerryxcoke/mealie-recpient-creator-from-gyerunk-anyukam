#!/usr/bin/env node
'use strict';

const MealieConfig = require('./src/config/MealieConfig');
const MealieAPI = require('./src/api/MealieAPI');
const MealieMenuCreator = require('./src/services/MealieMenuCreator');
const { ensureFetchAvailable } = require('./src/utils/fetch');
const { loadEnvFileFromDisk, printEnvInstructions } = require('./src/utils/env');
const { loadMenuData } = require('./src/utils/io');

/**
 * Main entry point for the Mealie Menu Creator CLI
 */
async function main() {
  // Ensure fetch API is available (Node 18+)
  try {
    ensureFetchAvailable();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  // Load environment variables from .env file
  const envLoaded = loadEnvFileFromDisk();
  if (envLoaded) {
    console.log('Loaded environment variables from .env');
  }

  // Initialize Mealie configuration
  let config;
  try {
    config = MealieConfig.fromEnv();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    printEnvInstructions();
    process.exit(1);
  }

  // Load menu data from file or stdin
  const jsonArg = process.argv[2];
  let menuData;

  try {
    menuData = await loadMenuData(jsonArg);
  } catch (error) {
    console.error(`Error loading menu data: ${error.message}`);
    process.exit(1);
  }

  // Initialize API client and menu creator
  const api = new MealieAPI(config);
  const creator = new MealieMenuCreator(api);

  // Process the weekly menu
  await creator.processWeeklyMenu(menuData);
}

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(`Unexpected error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = {
  MealieConfig,
  MealieAPI,
  MealieMenuCreator
};

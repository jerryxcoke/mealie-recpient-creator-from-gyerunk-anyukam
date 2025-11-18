'use strict';

const path = require('path');
const dotenv = require('dotenv');

/**
 * Load environment variables from .env file
 * @param {string} envFile - Name of the env file (defaults to '.env')
 * @returns {boolean} True if file was loaded successfully
 */
function loadEnvFileFromDisk(envFile = '.env') {
  const envPath = path.resolve(process.cwd(), envFile);
  const result = dotenv.config({ path: envPath, override: false });

  if (result.error) {
    if (result.error.code !== 'ENOENT') {
      console.warn(`Warning: Unable to load ${envFile}: ${result.error.message}`);
    }
    return false;
  }

  return Boolean(result.parsed);
}

/**
 * Print instructions for setting environment variables
 */
function printEnvInstructions() {
  console.log('\nPlease set the following environment variables:');
  console.log(
    '  MEALIE_BASE_URL - Your Mealie instance URL (default: http://localhost:9000)'
  );
  console.log('  MEALIE_API_TOKEN - Your Mealie API token (required)\n');
}

module.exports = {
  loadEnvFileFromDisk,
  printEnvInstructions
};

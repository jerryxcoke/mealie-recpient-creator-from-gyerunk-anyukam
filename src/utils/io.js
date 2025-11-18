'use strict';

const path = require('path');
const fs = require('fs/promises');

/**
 * Read JSON data from stdin
 * @returns {Promise<string>} The input from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

/**
 * Load menu data from file or stdin
 * @param {string} [jsonPathArg] - Optional path to JSON file
 * @returns {Promise<object>} Parsed menu data
 * @throws {Error} If JSON is invalid or no input received
 */
async function loadMenuData(jsonPathArg) {
  if (jsonPathArg) {
    const resolvedPath = path.resolve(process.cwd(), jsonPathArg);
    const fileContents = await fs.readFile(resolvedPath, 'utf8');
    try {
      return JSON.parse(fileContents);
    } catch (error) {
      throw new Error(`Invalid JSON in file '${resolvedPath}': ${error.message}`);
    }
  }

  console.log('Reading menu JSON from stdin (or provide filename as argument)...');
  console.log('Enter JSON data and press Ctrl+D when done:\n');
  const input = await readStdin();

  if (!input.trim()) {
    throw new Error('No JSON input received from stdin');
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON from stdin: ${error.message}`);
  }
}

module.exports = {
  readStdin,
  loadMenuData
};

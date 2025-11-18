'use strict';

/**
 * Ensure fetch API is available
 * @throws {Error} If fetch is not available
 */
function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error(
      'The Fetch API is not available in this version of Node.js. Please use Node 18 or newer.'
    );
  }
}

module.exports = {
  ensureFetchAvailable
};

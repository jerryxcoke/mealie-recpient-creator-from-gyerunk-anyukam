'use strict';

/**
 * Configuration for Mealie API connection
 */
class MealieConfig {
  /**
   * @param {string} baseUrl - Base URL of the Mealie instance
   * @param {string} apiToken - API token for authentication
   */
  constructor(baseUrl, apiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiToken = apiToken;
  }

  /**
   * Create MealieConfig from environment variables
   * @returns {MealieConfig}
   * @throws {Error} If MEALIE_API_TOKEN is not set
   */
  static fromEnv() {
    const baseUrl = process.env.MEALIE_BASE_URL || 'http://localhost:9000';
    const apiToken = process.env.MEALIE_API_TOKEN || '';

    if (!apiToken) {
      throw new Error('MEALIE_API_TOKEN environment variable is required');
    }

    return new MealieConfig(baseUrl, apiToken);
  }
}

module.exports = MealieConfig;

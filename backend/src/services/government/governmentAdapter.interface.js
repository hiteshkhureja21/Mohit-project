/**
 * Government Adapter Interface
 * Base abstraction for government data providers (data.gov.in, API Setu, etc.)
 */
export class GovernmentAdapter {
  /**
   * Provider identifier
   */
  get name() {
    return 'BaseGovernmentAdapter';
  }

  /**
   * Checks whether the required API credentials/onboarding exist
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }

  /**
   * Search open datasets from the government platform
   * @param {Object} params
   * @param {string} [params.query] - Search term or keywords
   * @param {number} [params.limit=10] - Number of records to return
   * @param {number} [params.offset=0] - Starting offset for pagination
   * @param {number} [params.timeoutMs=10000] - Request timeout
   * @returns {Promise<Array<Object>>}
   */
  async searchDatasets(params) {
    throw new Error(`searchDatasets() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Retrieve single dataset metadata by ID
   * @param {string} id - Dataset or resource identifier
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async getDatasetById(id, options) {
    throw new Error(`getDatasetById() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Retrieve records/rows from a specific dataset resource
   * @param {string} resourceId - Target resource ID
   * @param {Object} [params]
   * @returns {Promise<Object>}
   */
  async fetchResourceData(resourceId, params) {
    throw new Error(`fetchResourceData() must be implemented by ${this.constructor.name}`);
  }
}

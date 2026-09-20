/**
 * Government Data Service
 * Coordinates government open data adapters (data.gov.in, API Setu) with TTL caching
 * and query normalization.
 */

import { dataGovInAdapter } from './adapters/datagovin.adapter.js';
import { apiSetuAdapter } from './adapters/apisetu.adapter.js';
import { governmentCache } from './governmentCache.js';
import { env } from '../../config/env.js';

export class GovernmentService {
  constructor() {
    this.adapters = new Map();
    this.registerAdapter('data.gov.in', dataGovInAdapter);
    this.registerAdapter('apisetu', apiSetuAdapter);
    this.defaultAdapterName = 'data.gov.in';
  }

  /**
   * Registers a government platform adapter
   */
  registerAdapter(name, adapter) {
    if (!adapter || typeof adapter.searchDatasets !== 'function') {
      throw new Error(`Invalid government adapter for '${name}'`);
    }
    this.adapters.set(name.toLowerCase(), adapter);
  }

  /**
   * Retrieves an adapter by name
   */
  getAdapter(name) {
    const key = (name || this.defaultAdapterName).toLowerCase();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new Error(`Government adapter '${name}' is not registered.`);
    }
    return adapter;
  }

  /**
   * Retrieves open datasets matching query with caching
   * 
   * @param {Object} params
   * @param {string} [params.query=''] - Search term
   * @param {number} [params.limit=10] - Result limit (max 100)
   * @param {number} [params.offset=0] - Pagination offset
   * @param {string} [params.provider='data.gov.in'] - Target provider
   * @param {boolean} [params.forceRefresh=false] - Bypass cache
   * @returns {Promise<Array<Object>>}
   */
  async getDatasets({
    query = '',
    limit = 10,
    offset = 0,
    provider = 'data.gov.in',
    forceRefresh = false
  } = {}) {
    const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
    const cleanQuery = (query || '').trim();

    const cacheKey = governmentCache.generateKey('datasets', {
      query: cleanQuery.toLowerCase(),
      limit: safeLimit,
      offset: safeOffset,
      provider: provider.toLowerCase()
    });

    if (!forceRefresh) {
      const cached = governmentCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const adapter = this.getAdapter(provider);
    const results = await adapter.searchDatasets({
      query: cleanQuery,
      limit: safeLimit,
      offset: safeOffset
    });

    // Cache successful results
    const ttl = env.GOV_CACHE_TTL_MS || 600000;
    governmentCache.set(cacheKey, results, ttl);

    return results;
  }

  /**
   * Retrieves a single dataset by ID with caching
   */
  async getDatasetById(id, { provider = 'data.gov.in', forceRefresh = false } = {}) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      const err = new Error('Dataset ID is required.');
      err.code = 'INVALID_DATASET_ID';
      err.statusCode = 400;
      throw err;
    }

    const cleanId = id.trim();
    const cacheKey = `dataset:${provider.toLowerCase()}:${cleanId}`;

    if (!forceRefresh) {
      const cached = governmentCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const adapter = this.getAdapter(provider);
    const dataset = await adapter.getDatasetById(cleanId);

    const ttl = env.GOV_CACHE_TTL_MS || 600000;
    governmentCache.set(cacheKey, dataset, ttl);

    return dataset;
  }

  /**
   * Retrieves registered providers and configuration status without exposing credentials
   */
  getProviderStatus() {
    const providers = [];
    for (const [key, adapter] of this.adapters.entries()) {
      providers.push({
        id: key,
        name: adapter.name,
        isConfigured: adapter.isConfigured(),
        requiresOnboarding: adapter.name === 'API Setu'
      });
    }
    return providers;
  }

  /**
   * Clears the in-memory cache (e.g. for testing)
   */
  clearCache() {
    governmentCache.clear();
  }
}

export const governmentService = new GovernmentService();

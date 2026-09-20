/**
 * API Setu Adapter
 * Integration for API Setu (https://apisetu.gov.in)
 * 
 * Note: Per statutory governance rules, API Setu requires authorized agency onboarding,
 * client credentials, and specific API consent access. This adapter enforces those
 * prerequisites and does not assume services are publicly callable without onboarding.
 */

import { GovernmentAdapter } from '../governmentAdapter.interface.js';
import { env } from '../../../config/env.js';

export class ApiSetuAdapter extends GovernmentAdapter {
  constructor(config = {}) {
    super();
    this.baseUrl = (config.baseUrl || env.API_SETU_BASE_URL || 'https://apisetu.gov.in').replace(/\/+$/, '');
    this.clientId = config.clientId || env.API_SETU_CLIENT_ID || '';
    this.apiKey = config.apiKey || env.API_SETU_API_KEY || '';
    this.defaultTimeoutMs = config.timeoutMs || 10000;
  }

  get name() {
    return 'API Setu';
  }

  /**
   * Checks whether valid API Setu client credentials and onboarding are configured
   */
  isConfigured() {
    return Boolean(
      this.clientId &&
      this.clientId.trim().length > 0 &&
      this.apiKey &&
      this.apiKey.trim().length > 0
    );
  }

  /**
   * Search available services or published open APIs on API Setu
   */
  async searchDatasets({ query = '', limit = 10, offset = 0 } = {}) {
    // If onboarding is not configured
    if (!this.isConfigured()) {
      if (!env.DEMO_MODE) {
        const err = new Error('API Setu integration requires authorized institutional onboarding. Configure API_SETU_CLIENT_ID and API_SETU_API_KEY in backend/.env.');
        err.code = 'API_SETU_ONBOARDING_REQUIRED';
        err.statusCode = 503;
        throw err;
      }

      // In DEMO_MODE, return mock sandbox metadata indicating onboarding requirement
      return [
        {
          id: 'APISETU-SANDBOX-01',
          title: 'API Setu National Institutional Directory (Sandbox)',
          agency: 'National Informatics Centre / Ministry of Electronics & IT',
          url: 'https://apisetu.gov.in/directory',
          lastUpdated: '2026-09-10T12:00:00Z',
          summary: 'Institutional API gateway providing access to verified departmental issuers. Real-time consumption requires authorized agency onboarding.',
          recordCount: 450,
          source: this.name,
          onboardingStatus: 'SANDBOX_DEMO'
        }
      ];
    }

    // Real API Setu HTTPS call with authorized client headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/services?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`, {
        headers: {
          'X-APISETU-CLIENTID': this.clientId,
          'X-APISETU-APIKEY': this.apiKey,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = new Error(`API Setu request failed with HTTP ${res.status}`);
        err.code = 'API_SETU_ERROR';
        err.statusCode = res.status >= 500 ? 502 : res.status;
        throw err;
      }

      const data = await res.json();
      return (data.services || []).map(s => ({
        id: s.id,
        title: s.name,
        agency: s.department || 'API Setu Partner Agency',
        url: `${this.baseUrl}/service/${s.id}`,
        lastUpdated: s.updated_at || new Date().toISOString(),
        summary: s.description || 'Verified API Setu service.',
        recordCount: 1,
        source: this.name,
        onboardingStatus: 'ONBOARDED'
      }));
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('API Setu request timed out.');
        timeoutErr.code = 'API_SETU_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * Retrieve dataset or service metadata by ID
   */
  async getDatasetById(id) {
    if (!this.isConfigured() && !env.DEMO_MODE) {
      const err = new Error('API Setu integration requires authorized institutional onboarding.');
      err.code = 'API_SETU_ONBOARDING_REQUIRED';
      err.statusCode = 503;
      throw err;
    }

    if (id === 'APISETU-SANDBOX-01') {
      return {
        id: 'APISETU-SANDBOX-01',
        title: 'API Setu National Institutional Directory (Sandbox)',
        agency: 'National Informatics Centre / Ministry of Electronics & IT',
        url: 'https://apisetu.gov.in/directory',
        lastUpdated: '2026-09-10T12:00:00Z',
        summary: 'Institutional API gateway providing access to verified departmental issuers.',
        source: this.name,
        onboardingStatus: 'SANDBOX_DEMO'
      };
    }

    const err = new Error(`API Setu service '${id}' not found or requires specific consent access.`);
    err.code = 'API_SETU_SERVICE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
}

export const apiSetuAdapter = new ApiSetuAdapter();

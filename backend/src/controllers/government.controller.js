/**
 * Government Data Controller
 * HTTP handlers for government open data and API Setu endpoints.
 */

import { governmentService } from '../services/government/government.service.js';

export class GovernmentController {
  /**
   * GET /api/gov/datasets
   * Search or list government datasets
   */
  async getDatasets(req, res, next) {
    try {
      const { q, limit, offset, provider, refresh } = req.query;

      const datasets = await governmentService.getDatasets({
        query: q || '',
        limit: limit ? parseInt(limit, 10) : 10,
        offset: offset ? parseInt(offset, 10) : 0,
        provider: provider || 'data.gov.in',
        forceRefresh: refresh === 'true'
      });

      return res.status(200).json({
        success: true,
        data: datasets,
        count: datasets.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gov/datasets/:id
   * Retrieve single dataset metadata
   */
  async getDatasetById(req, res, next) {
    try {
      const { id } = req.params;
      const { provider, refresh } = req.query;

      const dataset = await governmentService.getDatasetById(id, {
        provider: provider || 'data.gov.in',
        forceRefresh: refresh === 'true'
      });

      return res.status(200).json({
        success: true,
        data: dataset,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gov/providers
   * Returns available government data providers and configuration status
   */
  async getProviders(req, res, next) {
    try {
      const providers = governmentService.getProviderStatus();
      return res.status(200).json({
        success: true,
        data: providers,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
}

export const governmentController = new GovernmentController();

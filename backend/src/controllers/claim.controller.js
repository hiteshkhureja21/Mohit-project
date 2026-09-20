/**
 * Claim Controller
 * Request handlers for grounding claims, evidence verification, and review state.
 */

import { claimsService } from '../services/claims/claims.service.js';

export class ClaimController {
  /**
   * GET /api/claims
   * Retrieves claims with optional filtering by transformationId or status
   */
  async getClaims(req, res) {
    try {
      const workspaceId = req.workspaceId;
      const { transformationId, jobId, status } = req.query;

      const results = await claimsService.getClaims(workspaceId, {
        transformationId: transformationId || jobId,
        status
      });

      return res.json({
        success: true,
        data: results,
        message: 'Claims retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[ClaimController.getClaims] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'CLAIMS_FETCH_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/claims/:id
   * Retrieves single claim by ID with full evidence bundle
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      const claim = await claimsService.getClaimById(id, workspaceId);

      return res.json({
        success: true,
        data: claim,
        message: 'Claim retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[ClaimController.getById] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'CLAIM_NOT_FOUND', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/claims/verify
   * Evaluates grounding of a claim against anchor passage and source document
   */
  async verify(req, res) {
    try {
      const { claimText, anchorPassage, sourceText, pageNumber, isAiGenerated } = req.body || {};

      if (!claimText) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'claimText is required for verification.' },
          timestamp: new Date().toISOString()
        });
      }

      const verification = claimsService.verifyClaimAgainstSource(
        claimText,
        anchorPassage,
        sourceText,
        { pageNumber, isAiGenerated }
      );

      return res.json({
        success: true,
        data: verification,
        message: 'Claim grounding verification executed',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[ClaimController.verify] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'VERIFICATION_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PATCH /api/claims/:id
   * Updates a claim's status, phrasing, or reviewer note
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user?.id || req.user?.name || 'Authorized Reviewer';

      const updated = await claimsService.updateClaim(id, workspaceId, userId, req.body || {});

      return res.json({
        success: true,
        data: updated,
        message: 'Claim updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[ClaimController.update] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'CLAIM_UPDATE_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /api/claims/:id
   * Removes a claim from verified scope
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      const result = await claimsService.deleteClaim(id, workspaceId);

      return res.json({
        success: true,
        data: result,
        message: 'Claim deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[ClaimController.delete] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'CLAIM_DELETE_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const claimController = new ClaimController();

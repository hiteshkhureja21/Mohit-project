/**
 * Transformation Controller
 * HTTP handlers for the 6-stage transformation workflow.
 */

import { transformationService } from '../services/transformation/transformation.service.js';

export class TransformationController {
  /**
   * POST /api/transformations
   * Stage 1: Initialize transformation with source file
   */
  async create(req, res) {
    try {
      const workspaceId = req.workspaceId;
      const userId = req.user?.id || 'usr-anonymous';
      const { fileId, documentId, title, profiles, outputs } = req.body || {};

      const transformation = await transformationService.createTransformation(
        workspaceId,
        userId,
        {
          fileId: fileId || documentId,
          title,
          profiles,
          outputs
        }
      );

      return res.status(201).json({
        success: true,
        data: transformation,
        message: 'Transformation initialized successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.create] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'TRANSFORMATION_INIT_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/transformations/:id
   * Retrieve full transformation by ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      const transformation = await transformationService.getTransformation(id, workspaceId);

      return res.json({
        success: true,
        data: transformation,
        message: 'Transformation retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.getById] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'TRANSFORMATION_FETCH_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/transformations
   * List all transformations in the active workspace
   */
  async list(req, res) {
    try {
      const workspaceId = req.workspaceId;
      const list = await transformationService.listTransformations(workspaceId);

      return res.json({
        success: true,
        data: list,
        message: 'Transformations listed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.list] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'TRANSFORMATION_LIST_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PATCH /api/transformations/:id/audience
   * Stage 2: Save audience profiles and tone
   */
  async updateAudience(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user?.id || 'usr-anonymous';

      const updated = await transformationService.updateAudienceConfig(
        id,
        workspaceId,
        userId,
        req.body || {}
      );

      return res.json({
        success: true,
        data: updated,
        message: 'Audience configuration updated',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.updateAudience] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'AUDIENCE_UPDATE_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PATCH /api/transformations/:id/outputs-config
   * Stage 3: Save requested output format options
   */
  async updateOutputsConfig(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user?.id || 'usr-anonymous';

      const updated = await transformationService.updateOutputConfig(
        id,
        workspaceId,
        userId,
        req.body || {}
      );

      return res.json({
        success: true,
        data: updated,
        message: 'Output format configuration updated',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.updateOutputsConfig] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'OUTPUT_CONFIG_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/transformations/:id/generate
   * Stage 4: Call the AI pipeline to generate structured deliverables and extract claims
   */
  async generate(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user?.id || 'usr-anonymous';

      const result = await transformationService.executeGeneration(
        id,
        workspaceId,
        userId,
        req.body || {}
      );

      return res.json({
        success: true,
        data: result,
        message: 'Deliverables generated and grounded claims extracted',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.generate] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'GENERATION_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/transformations/:id/review
   * Stage 5: Get claims, evidence anchors, and review approval state
   */
  async getReview(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      const reviewData = await transformationService.getReviewData(id, workspaceId);

      return res.json({
        success: true,
        data: reviewData,
        message: 'Review data retrieved',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.getReview] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'REVIEW_FETCH_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PATCH /api/transformations/:id/claims/:claimId
   * Stage 5: Update a claim's status or phrasing
   */
  async updateClaim(req, res) {
    try {
      const { id, claimId } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user?.id || 'usr-anonymous';

      const updatedClaim = await transformationService.updateClaim(
        id,
        claimId,
        workspaceId,
        userId,
        req.body || {}
      );

      return res.json({
        success: true,
        data: updatedClaim,
        message: 'Claim updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.updateClaim] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'CLAIM_UPDATE_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/transformations/:id/approve
   * Stage 5: Formal human review sign-off
   */
  async approve(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const user = req.user || { name: 'Authorized Operator' };

      const approved = await transformationService.approveReview(id, workspaceId, user);

      return res.json({
        success: true,
        data: approved,
        message: 'Transformation approved for delivery',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.approve] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'APPROVAL_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/transformations/:id/prepare-delivery
   * Stage 6: Prepare final output deliverables for dispatch
   */
  async prepareDelivery(req, res) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;
      const userId = req.user?.id || 'usr-anonymous';

      const prepared = await transformationService.prepareDelivery(
        id,
        workspaceId,
        userId,
        req.body || {}
      );

      return res.json({
        success: true,
        data: prepared,
        message: 'Delivery package prepared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TransformationController.prepareDelivery] Error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'DELIVERY_PREPARATION_FAILED', message: err.message },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const transformationController = new TransformationController();

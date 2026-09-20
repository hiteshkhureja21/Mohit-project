/**
 * Translation Controller
 * HTTP handlers for institutional translation operations.
 * 
 * STEP 8: Translation Integration (LibreTranslate)
 * Endpoints:
 * - POST /api/translate             -> Execute text or file translation
 * - GET  /api/translate             -> List translations with workspace authorization & filters
 * - GET  /api/translate/:id         -> Retrieve single translation record
 * - GET  /api/translate/languages   -> Catalog of supported languages
 */

import { translationService } from '../services/translation/translation.service.js';
import { WorkspaceMemberService } from '../services/workspaceMember.service.js';
import { workspaceService } from '../services/workspace.service.js';
import { storageService } from '../services/files/storage.service.js';

const workspaceMemberService = new WorkspaceMemberService();

export class TranslationController {
  /**
   * POST /api/translate
   * Translates text or file content into target language
   */
  async translate(req, res, next) {
    try {
      // 1. Authenticate user
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required for translation.'
          }
        });
      }

      const userId = req.user.id;
      const { text, sourceLanguage = 'auto', targetLanguage, format = 'text' } = req.body;
      const fileId = req.body.fileId || req.body.file_id || null;

      // 2. Validate workspaceId
      const workspaceId = req.body.workspaceId || req.body.workspace_id || req.headers['x-workspace-id'] || req.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field "workspaceId" is required either in request body or X-Workspace-Id header.'
          }
        });
      }

      // 3. Verify workspace membership and role (editor or owner required for translation)
      const role = await workspaceMemberService.getMemberRole(workspaceId, userId);
      if (!role) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: `Access denied. You do not belong to workspace '${workspaceId}'.`
          }
        });
      }

      if (role === 'viewer') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: "Insufficient workspace permissions. Required role: 'editor' or 'owner', your role: 'viewer'."
          }
        });
      }

      // 4. If fileId provided, verify file exists and belongs to this workspace
      if (fileId) {
        const file = await storageService.getFileById(fileId);
        if (!file) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'FILE_NOT_FOUND',
              message: `File '${fileId}' not found.`
            }
          });
        }

        const fileWsId = file.workspace_id || file.workspaceId;
        if (fileWsId && fileWsId !== workspaceId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Access denied. File belongs to another workspace.'
            }
          });
        }
      }

      // 5. Execute translation via translationService
      const result = await translationService.translateText({
        text,
        fileId,
        sourceLanguage,
        targetLanguage,
        workspaceId,
        userId,
        format
      });

      return res.status(200).json({
        success: true,
        data: {
          id: result.translationId,
          translationId: result.translationId,
          sourceLanguage: result.sourceLanguage,
          detectedLanguage: result.detectedLanguage,
          targetLanguage: result.targetLanguage,
          translatedText: result.translatedText,
          provider: (result.provider || 'libretranslate').toLowerCase(),
          status: (result.status || 'completed').toLowerCase(),
          characterCount: result.characterCount,
          durationMs: result.durationMs,
          fileId: result.fileId,
          workspaceId: result.workspaceId,
          createdAt: result.createdAt
        },
        message: 'Translation completed successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/translate/:id
   * Retrieves a single translation record with workspace access verification
   */
  async getTranslationById(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required.'
          }
        });
      }

      const { id } = req.params;
      const translation = await translationService.getTranslation(id);
      if (!translation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TRANSLATION_NOT_FOUND',
            message: `Translation with ID '${id}' not found.`
          }
        });
      }

      // Verify caller is a member of the translation's workspace
      const targetWsId = translation.workspaceId || translation.workspace_id;
      if (targetWsId) {
        const isMember = await workspaceMemberService.isMember(targetWsId, req.user.id);
        if (!isMember) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: `Access denied. You do not belong to workspace '${targetWsId}'.`
            }
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: translation,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/translate
   * Lists translation history filtered by workspaceId, fileId, status, and pagination
   */
  async listTranslations(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required.'
          }
        });
      }

      const { workspaceId, fileId, status, limit, offset } = req.query;

      // If workspaceId specified, verify caller is a member
      if (workspaceId) {
        const isMember = await workspaceMemberService.isMember(workspaceId, req.user.id);
        if (!isMember) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: `Access denied. You do not belong to workspace '${workspaceId}'.`
            }
          });
        }
      } else {
        // If workspaceId omitted, resolve user's workspaces to prevent data leakage
        const userWorkspaces = await workspaceService.getUserWorkspaces(req.user.id);
        const authorizedWorkspaceIds = new Set(userWorkspaces.map(w => w.id));

        const allTranslations = await translationService.listTranslations({
          fileId,
          status,
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0
        });

        const filtered = allTranslations.filter(t => 
          !t.workspaceId || authorizedWorkspaceIds.has(t.workspaceId)
        );

        return res.status(200).json({
          success: true,
          data: filtered,
          timestamp: new Date().toISOString()
        });
      }

      const translations = await translationService.listTranslations({
        workspaceId,
        fileId,
        status,
        limit,
        offset
      });

      return res.status(200).json({
        success: true,
        data: translations,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/translate/languages
   * Returns list of supported languages
   */
  async getSupportedLanguages(req, res, next) {
    try {
      const languages = await translationService.getSupportedLanguages();
      return res.status(200).json({
        success: true,
        data: languages,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
}

export const translationController = new TranslationController();

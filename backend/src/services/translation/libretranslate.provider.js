/**
 * LibreTranslate Provider
 * Re-exports LibreTranslateService for backward compatibility with existing imports.
 */

export {
  LibreTranslateService,
  LibreTranslateService as LibreTranslateProvider,
  libreTranslateService,
  libreTranslateService as libreTranslateProvider,
  STANDARD_LANGUAGES
} from './libretranslate.service.js';

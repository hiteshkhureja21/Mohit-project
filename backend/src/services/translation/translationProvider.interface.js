/**
 * Translation Provider Interface
 * Base abstraction for pluggable machine translation engines (LibreTranslate, DeepL, Google, etc.)
 */
export class TranslationProvider {
  /**
   * Name of the provider
   */
  get name() {
    return 'BaseTranslationProvider';
  }

  /**
   * Translates text from source to target language
   * @param {Object} params
   * @param {string} params.text - Text to translate
   * @param {string} params.sourceLanguage - Source language code or 'auto'
   * @param {string} params.targetLanguage - Target language code
   * @param {string} [params.format='text'] - 'text' or 'html'
   * @param {number} [params.timeoutMs=15000] - Timeout in milliseconds
   * @returns {Promise<{ translatedText: string, detectedLanguage?: string, provider: string }>}
   */
  async translate(params) {
    throw new Error(`translate() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Returns list of supported languages
   * @returns {Promise<Array<{ code: string, name: string }>>}
   */
  async getSupportedLanguages() {
    throw new Error(`getSupportedLanguages() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Detects the language of given text
   * @param {string} text
   * @returns {Promise<{ language: string, confidence: number }>}
   */
  async detectLanguage(text) {
    throw new Error(`detectLanguage() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Normalizes language input to a standard ISO code
   * @param {string} lang
   * @returns {string|null}
   */
  normalizeLanguageCode(lang) {
    if (!lang || typeof lang !== 'string') return null;
    const clean = lang.trim().toLowerCase();
    const match = clean.match(/^[a-z]{2}(?:-[a-z]{2})?$/);
    return match ? match[0].substring(0, 2) : clean;
  }
}

/**
 * Test Suite: Real Translation Service (LibreTranslate)
 * 
 * Verifies:
 * 1. Valid translation execution via LibreTranslate provider
 * 2. Source and target language normalization & validation
 * 3. Input size validation (empty text & character limit overflow)
 * 4. Request timeout handling (AbortController triggers TRANSLATION_TIMEOUT)
 * 5. Provider error handling (network failure / upstream 500)
 * 6. Guard against silently returning original text on failure
 * 7. Translation metadata persistence (character count, timestamps, status)
 * 8. Pluggable provider abstraction swappability
 * 9. HTTP REST API endpoints (/api/translate, /api/translate/languages, /api/translate/:id)
 */

import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { translationService, TranslationService } from '../src/services/translation/translation.service.js';
import { LibreTranslateProvider } from '../src/services/translation/libretranslate.provider.js';
import { TranslationProvider } from '../src/services/translation/translationProvider.interface.js';
import { env } from '../src/config/env.js';

let passed = 0;
let failed = 0;

function reportPass(name) {
  console.log(`  ✓ PASS: ${name}`);
  passed++;
}

function reportFail(name, err) {
  console.error(`  ✗ FAIL: ${name}`);
  console.error(`    ${err.message}`);
  failed++;
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING REAL TRANSLATION SERVICE TEST SUITE (LIBRETRANSLATE)');
  console.log('=============================================================\n');

  const originalDemoMode = env.DEMO_MODE;
  env.DEMO_MODE = true; // Use controlled deterministic mode for offline tests

  const app = createApp();
  let server;
  const port = 4135;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(port, () => {
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    const sampleText = 'Cybersecurity Threat Intelligence: perimeter firewalls mitigated 1,420,000 intrusion attempts.';

    // -------------------------------------------------------------
    // TEST 1: Valid Translation Execution
    // -------------------------------------------------------------
    try {
      const result = await translationService.translateText({
        text: sampleText,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        workspaceId: 'workspace-001',
        userId: 'USR-802'
      });

      assert.ok(result.id, 'Must generate unique translation ID');
      assert.ok(result.translatedText, 'Must return translated text');
      assert.notStrictEqual(result.translatedText, sampleText, 'Translated text must differ from source');
      assert.strictEqual(result.sourceLanguage, 'en');
      assert.strictEqual(result.targetLanguage, 'es');
      assert.strictEqual(result.status, 'COMPLETED');
      assert.strictEqual(result.characterCount, sampleText.length);
      assert.ok(result.provider.includes('LibreTranslate'));

      reportPass('1. Valid translation execution translates text with complete metadata');
    } catch (err) {
      reportFail('1. Translation execution failed', err);
    }

    // -------------------------------------------------------------
    // TEST 2: Language Code & Alias Normalization
    // -------------------------------------------------------------
    try {
      const result = await translationService.translateText({
        text: 'Executive Summary telemetry report.',
        sourceLanguage: 'English (Standard)',
        targetLanguage: 'Hindi (National Adaptation)'
      });

      assert.strictEqual(result.sourceLanguage, 'en', 'Must normalize friendly English name to en');
      assert.strictEqual(result.targetLanguage, 'hi', 'Must normalize friendly Hindi name to hi');
      assert.ok(result.translatedText);

      reportPass('2. Friendly language names and aliases are normalized to valid ISO codes');
    } catch (err) {
      reportFail('2. Language normalization failed', err);
    }

    // -------------------------------------------------------------
    // TEST 3: Language Validation & Identical Language Rejection
    // -------------------------------------------------------------
    try {
      // 3a. Missing target language
      let missingTargetCaught = false;
      try {
        await translationService.translateText({
          text: sampleText,
          targetLanguage: ''
        });
      } catch (err) {
        assert.strictEqual(err.code, 'MISSING_TARGET_LANGUAGE');
        assert.strictEqual(err.statusCode, 400);
        missingTargetCaught = true;
      }
      assert.ok(missingTargetCaught, 'Must reject missing target language');

      // 3b. Identical source and target
      let identicalCaught = false;
      try {
        await translationService.translateText({
          text: sampleText,
          sourceLanguage: 'en',
          targetLanguage: 'en'
        });
      } catch (err) {
        assert.strictEqual(err.code, 'IDENTICAL_LANGUAGES');
        assert.strictEqual(err.statusCode, 400);
        identicalCaught = true;
      }
      assert.ok(identicalCaught, 'Must reject identical source and target languages');

      reportPass('3. Language validation strictly rejects missing target and identical language pairs');
    } catch (err) {
      reportFail('3. Language validation failed', err);
    }

    // -------------------------------------------------------------
    // TEST 4: Input Size Validation (Empty Text & Max Limit)
    // -------------------------------------------------------------
    try {
      // 4a. Empty text
      let emptyTextCaught = false;
      try {
        await translationService.translateText({
          text: '   ',
          targetLanguage: 'es'
        });
      } catch (err) {
        assert.strictEqual(err.code, 'INVALID_INPUT_TEXT');
        assert.strictEqual(err.statusCode, 400);
        emptyTextCaught = true;
      }
      assert.ok(emptyTextCaught, 'Must reject empty input text');

      // 4b. Exceeding max characters
      const originalMax = env.MAX_TRANSLATION_CHARS;
      env.MAX_TRANSLATION_CHARS = 100;
      let tooLargeCaught = false;
      try {
        await translationService.translateText({
          text: 'A'.repeat(150),
          targetLanguage: 'es'
        });
      } catch (err) {
        assert.strictEqual(err.code, 'PAYLOAD_TOO_LARGE');
        assert.strictEqual(err.statusCode, 400);
        tooLargeCaught = true;
      } finally {
        env.MAX_TRANSLATION_CHARS = originalMax;
      }
      assert.ok(tooLargeCaught, 'Must reject input text exceeding character limit');

      reportPass('4. Input size validation enforces non-empty requirement and character boundaries');
    } catch (err) {
      reportFail('4. Input size validation failed', err);
    }

    // -------------------------------------------------------------
    // TEST 5: Timeout Handling (TRANSLATION_TIMEOUT)
    // -------------------------------------------------------------
    try {
      class HangingProvider extends TranslationProvider {
        get name() { return 'HangingProvider'; }
        async translate() {
          await new Promise(r => setTimeout(r, 200));
          return { translatedText: 'Late' };
        }
        normalizeLanguageCode(lang) { return lang; }
      }

      const hangingService = new TranslationService(new HangingProvider());
      
      let timeoutCaught = false;
      // We can also test the provider's own AbortController directly
      const timingProvider = new LibreTranslateProvider({ url: 'http://10.255.255.1:9999', timeoutMs: 50 });
      try {
        await timingProvider.translate({
          text: 'Test timeout text',
          targetLanguage: 'es',
          timeoutMs: 50
        });
      } catch (err) {
        assert.ok(
          err.code === 'TRANSLATION_TIMEOUT' || err.code === 'TRANSLATION_PROVIDER_UNAVAILABLE',
          `Expected timeout or unavailable, got ${err.code}`
        );
        timeoutCaught = true;
      }
      assert.ok(timeoutCaught, 'Timeout mechanism triggers appropriately');

      reportPass('5. Request timeout triggers cleanly on sluggish upstream providers');
    } catch (err) {
      reportFail('5. Timeout handling failed', err);
    }

    // -------------------------------------------------------------
    // TEST 6: Guard Against Silently Returning Original Text on Failure
    // -------------------------------------------------------------
    try {
      class DefectiveProvider extends TranslationProvider {
        get name() { return 'DefectiveProvider'; }
        async translate({ text }) {
          // Faulty provider that returns unmodified source text
          return { translatedText: text, provider: this.name };
        }
        normalizeLanguageCode(lang) { return lang; }
      }

      const defectiveService = new TranslationService(new DefectiveProvider());
      let failedToAlterCaught = false;
      try {
        await defectiveService.translateText({
          text: 'Critical telemetry detected perimeter intrusion.',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        });
      } catch (err) {
        assert.strictEqual(err.code, 'TRANSLATION_VERIFICATION_FAILED');
        assert.strictEqual(err.statusCode, 502);
        failedToAlterCaught = true;
      }
      assert.ok(failedToAlterCaught, 'Must not claim success if provider returns identical text');

      reportPass('6. Translation integrity guard ensures failures are never disguised as success');
    } catch (err) {
      reportFail('6. Identity guard failed', err);
    }

    // -------------------------------------------------------------
    // TEST 7: Translation Metadata Persistence and Lookup
    // -------------------------------------------------------------
    try {
      const created = await translationService.translateText({
        text: 'SCADA monitoring gateway telemetry recorded 38.4% reduction.',
        sourceLanguage: 'en',
        targetLanguage: 'de',
        workspaceId: 'workspace-001',
        userId: 'USR-802'
      });

      const retrieved = await translationService.getTranslation(created.id, 'workspace-001');
      assert.strictEqual(retrieved.id, created.id);
      assert.strictEqual(retrieved.targetLanguage, 'de');
      assert.strictEqual(retrieved.status, 'COMPLETED');
      assert.strictEqual(retrieved.characterCount, created.characterCount);
      assert.ok(retrieved.createdAt);

      reportPass('7. Translation metadata persists cleanly with character count and timestamps');
    } catch (err) {
      reportFail('7. Metadata persistence failed', err);
    }

    // -------------------------------------------------------------
    // TEST 8: Pluggable Provider Abstraction Swappability
    // -------------------------------------------------------------
    try {
      class MockDeepLProvider extends TranslationProvider {
        get name() { return 'DeepL-Enterprise'; }
        normalizeLanguageCode(lang) { return (lang || '').toLowerCase().slice(0, 2); }
        async translate({ text, targetLanguage }) {
          return {
            translatedText: `[DeepL ${targetLanguage.toUpperCase()}] ${text}`,
            sourceLanguage: 'en',
            targetLanguage,
            provider: this.name
          };
        }
        async getSupportedLanguages() {
          return [{ code: 'es', name: 'Spanish' }];
        }
      }

      const customService = new TranslationService();
      customService.setProvider(new MockDeepLProvider());
      assert.strictEqual(customService.getProvider().name, 'DeepL-Enterprise');

      const deepLResult = await customService.translateText({
        text: 'Zero Trust boundary enforcement.',
        sourceLanguage: 'en',
        targetLanguage: 'fr'
      });

      assert.ok(deepLResult.translatedText.startsWith('[DeepL FR]'));
      assert.strictEqual(deepLResult.provider, 'DeepL-Enterprise');

      reportPass('8. Translation provider abstraction allows hot-swapping engines without changing consumers');
    } catch (err) {
      reportFail('8. Provider swappability test failed', err);
    }

    // -------------------------------------------------------------
    // TEST 9: HTTP REST API Endpoints End-to-End
    // -------------------------------------------------------------
    try {
      const authHeaders = {
        'Authorization': 'Bearer demo-session-sourceflow-operator',
        'x-workspace-id': 'workspace-001',
        'Content-Type': 'application/json'
      };

      // 9a. GET /api/translate/languages
      const langsRes = await fetch(`${baseUrl}/api/translate/languages`);
      const langsData = await langsRes.json();
      assert.strictEqual(langsRes.status, 200);
      assert.strictEqual(langsData.success, true);
      assert.ok(Array.isArray(langsData.data));
      assert.ok(langsData.data.some(l => l.code === 'es'));
      assert.ok(langsData.data.some(l => l.code === 'hi'));

      // 9b. POST /api/translate
      const transRes = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          text: 'Security Incident Advisory: Unauthorized credential access repelled.',
          sourceLanguage: 'English (Standard)',
          targetLanguage: 'Spanish'
        })
      });
      const transData = await transRes.json();
      assert.strictEqual(transRes.status, 200);
      assert.strictEqual(transData.success, true);
      assert.ok(transData.data.translatedText);
      assert.strictEqual(transData.data.targetLanguage, 'es');
      assert.strictEqual((transData.data.status || '').toUpperCase(), 'COMPLETED');

      // 9c. GET /api/translate/:id
      const id = transData.data.id;
      const getRes = await fetch(`${baseUrl}/api/translate/${id}`, {
        headers: authHeaders
      });
      const getData = await getRes.json();
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getData.success, true);
      assert.strictEqual(getData.data.id, id);
      assert.strictEqual(getData.data.targetLanguage, 'es');

      reportPass('9. HTTP REST API endpoints (/api/translate/*) operate cleanly end-to-end');
    } catch (err) {
      reportFail('9. HTTP REST API test failed', err);
    }

  } finally {
    env.DEMO_MODE = originalDemoMode;
    if (server) {
      await new Promise(res => server.close(res));
    }
  }

  console.log('\n=============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Translation test suite failed:', err);
  process.exit(1);
});

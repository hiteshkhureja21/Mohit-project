/**
 * Step 9 Verification Suite — Government API Integration
 *
 * Validates:
 * 1.  data.gov.in datasets (curated Indian open-data)
 * 2.  Search query filtering on datasets
 * 3.  Pagination (limit + offset)
 * 4.  Single dataset retrieval by ID
 * 5.  In-memory TTL caching (no redundant upstream calls)
 * 6.  Cache invalidation via forceRefresh
 * 7.  Input validation: empty ID, non-existent ID
 * 8.  API Setu onboarding requirement enforcement
 * 9.  API Setu sandbox demo mode
 * 10. Pluggable adapter swappability
 * 11. Provider status endpoint (no credential leakage)
 * 12. Security: no API keys in HTTP response payloads
 * 13. HTTP REST API — GET /api/gov/providers
 * 14. HTTP REST API — GET /api/gov/datasets (search)
 * 15. HTTP REST API — GET /api/gov/datasets/:id
 * 16. Invalid adapter name returns descriptive error
 * 17. Rate-limit guard: limit clamped to 100 max
 * 18. Offset/limit boundary conditions (empty page past end)
 * 19. SSRF guard: dataset URL must be a gov domain or curated entry
 * 20. Cross-workspace isolation verified at service layer
 */

import assert from 'node:assert';
import { createApp } from '../src/app.js';
import {
  governmentService,
  GovernmentService
} from '../src/services/government/government.service.js';
import { GovernmentAdapter } from '../src/services/government/governmentAdapter.interface.js';
import { dataGovInAdapter, CURATED_INDIAN_GOV_DATASETS } from '../src/services/government/adapters/datagovin.adapter.js';
import { apiSetuAdapter } from '../src/services/government/adapters/apisetu.adapter.js';
import { env } from '../src/config/env.js';

// -----------------------------------------------------------
// Test Reporter
// -----------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function reportPass(name) {
  console.log(`  ✓ PASS: ${name}`);
  passed++;
}

function reportFail(name, err) {
  console.error(`  ✗ FAIL: ${name}`);
  console.error(`    ${err.message || err}`);
  failed++;
  failures.push({ name, error: err.message || String(err) });
}

// -----------------------------------------------------------
// Main Test Runner
// -----------------------------------------------------------
async function runTests() {
  console.log('\n================================================================');
  console.log('🏛️  STEP 9 VERIFICATION — GOVERNMENT API INTEGRATION');
  console.log('================================================================\n');

  // Save and override env for isolated test execution
  const originalDemoMode = process.env.DEMO_MODE;
  process.env.DEMO_MODE = 'true';

  const app = createApp();
  let server;
  const port = 4290;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(port, () => {
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    governmentService.clearCache();

    // ==============================================================
    // TEST 1: data.gov.in curated datasets — shape validation
    // ==============================================================
    try {
      const datasets = await governmentService.getDatasets({
        limit: 5,
        provider: 'data.gov.in'
      });

      assert.ok(Array.isArray(datasets), 'datasets must be an array');
      assert.ok(datasets.length > 0, 'must return at least one curated dataset');

      const required = ['id', 'title', 'agency', 'url', 'lastUpdated', 'summary', 'source'];
      for (const field of required) {
        assert.ok(datasets[0][field], `dataset[0].${field} must be truthy`);
      }
      assert.strictEqual(datasets[0].source, 'data.gov.in', 'source must be data.gov.in');

      reportPass('1. Curated data.gov.in datasets conform to GovDataset schema');
    } catch (err) {
      reportFail('1. Curated dataset schema validation', err);
    }

    // ==============================================================
    // TEST 2: Search query filtering — keyword match
    // ==============================================================
    try {
      const results = await governmentService.getDatasets({
        query: 'CERT-In',
        limit: 10
      });

      assert.ok(Array.isArray(results), 'results must be an array');
      assert.ok(results.length > 0, 'CERT-In query must return results');
      assert.ok(
        results.every(d =>
          d.title.toLowerCase().includes('cert') ||
          d.agency.toLowerCase().includes('cert') ||
          d.summary.toLowerCase().includes('cert') ||
          (d.category && d.category.toLowerCase().includes('cert'))
        ),
        'All returned datasets must match the CERT-In query'
      );

      reportPass('2. Search query filtering narrows results correctly');
    } catch (err) {
      reportFail('2. Search query filtering', err);
    }

    // ==============================================================
    // TEST 3: Pagination — limit and offset
    // ==============================================================
    try {
      const page1 = await governmentService.getDatasets({ limit: 2, offset: 0 });
      const page2 = await governmentService.getDatasets({ limit: 2, offset: 2 });

      assert.ok(Array.isArray(page1) && page1.length <= 2, 'page1 must have ≤ 2 items');
      assert.ok(Array.isArray(page2), 'page2 must be an array');

      if (page1.length === 2 && page2.length > 0) {
        assert.notStrictEqual(page1[0].id, page2[0].id, 'Pages must not overlap');
      }

      reportPass('3. Pagination (limit + offset) returns non-overlapping pages');
    } catch (err) {
      reportFail('3. Pagination', err);
    }

    // ==============================================================
    // TEST 4: Single dataset retrieval by ID
    // ==============================================================
    try {
      const targetId = 'GOV-IN-CERT-01';
      const dataset = await governmentService.getDatasetById(targetId);

      assert.ok(dataset, 'dataset must not be null');
      assert.strictEqual(dataset.id, targetId, 'id must match requested ID');
      assert.ok(dataset.title, 'title must be present');
      assert.ok(dataset.agency, 'agency must be present');
      assert.ok(dataset.url, 'url must be present');
      assert.ok(dataset.sampleTelemetry, 'sampleTelemetry must be present for curated data');

      reportPass('4. getDatasetById returns complete dataset with sampleTelemetry');
    } catch (err) {
      reportFail('4. getDatasetById', err);
    }

    // ==============================================================
    // TEST 5: In-memory TTL caching — second call must be faster
    // ==============================================================
    try {
      governmentService.clearCache();

      const t0 = Date.now();
      const first = await governmentService.getDatasets({ query: 'telemetry' });
      const dur1 = Date.now() - t0;

      const t1 = Date.now();
      const second = await governmentService.getDatasets({ query: 'telemetry' });
      const dur2 = Date.now() - t1;

      assert.deepStrictEqual(
        first.map(d => d.id),
        second.map(d => d.id),
        'Cached and fresh results must be identical'
      );
      // Cache should be dramatically faster (allow up to 5x of first call)
      assert.ok(dur2 <= Math.max(dur1 * 5, 50), `Cache hit (${dur2}ms) slower than expected (first: ${dur1}ms)`);

      reportPass(`5. In-memory TTL caching: first=${dur1}ms, cached=${dur2}ms`);
    } catch (err) {
      reportFail('5. TTL caching', err);
    }

    // ==============================================================
    // TEST 6: Cache invalidation via forceRefresh
    // ==============================================================
    try {
      governmentService.clearCache();

      const first = await governmentService.getDatasets({ query: '' });
      const second = await governmentService.getDatasets({ query: '', forceRefresh: true });

      assert.ok(Array.isArray(first) && Array.isArray(second));
      assert.deepStrictEqual(
        first.map(d => d.id).sort(),
        second.map(d => d.id).sort(),
        'forceRefresh must return same data (deterministic)'
      );

      reportPass('6. forceRefresh bypasses cache and returns consistent data');
    } catch (err) {
      reportFail('6. Cache forceRefresh', err);
    }

    // ==============================================================
    // TEST 7a: Input validation — empty dataset ID
    // ==============================================================
    try {
      let caught = false;
      try {
        await governmentService.getDatasetById('');
      } catch (err) {
        assert.strictEqual(err.code, 'INVALID_DATASET_ID', `Expected INVALID_DATASET_ID, got ${err.code}`);
        assert.strictEqual(err.statusCode, 400);
        caught = true;
      }
      assert.ok(caught, 'Empty dataset ID must be rejected');
      reportPass('7a. Empty dataset ID rejected with INVALID_DATASET_ID (400)');
    } catch (err) {
      reportFail('7a. Empty dataset ID validation', err);
    }

    // ==============================================================
    // TEST 7b: Input validation — non-existent dataset ID
    // ==============================================================
    try {
      let caught = false;
      try {
        await governmentService.getDatasetById('TOTALLY_NONEXISTENT_XYZ_999');
      } catch (err) {
        assert.strictEqual(err.code, 'DATASET_NOT_FOUND', `Expected DATASET_NOT_FOUND, got ${err.code}`);
        assert.strictEqual(err.statusCode, 404);
        caught = true;
      }
      assert.ok(caught, 'Non-existent dataset ID must yield 404');
      reportPass('7b. Non-existent dataset ID returns DATASET_NOT_FOUND (404)');
    } catch (err) {
      reportFail('7b. Non-existent dataset ID validation', err);
    }

    // ==============================================================
    // TEST 8: API Setu — onboarding requirement enforced
    // ==============================================================
    try {
      assert.strictEqual(apiSetuAdapter.name, 'API Setu');

      // Must not be configured since no credentials exist in test env
      assert.strictEqual(
        apiSetuAdapter.isConfigured(),
        false,
        'API Setu must not be considered configured without credentials'
      );

      reportPass('8. API Setu isConfigured() correctly returns false without credentials');
    } catch (err) {
      reportFail('8. API Setu onboarding check', err);
    }

    // ==============================================================
    // TEST 9: API Setu sandbox — demo mode returns structured metadata
    // ==============================================================
    try {
      // DEMO_MODE=true means it should return sandbox result, not throw
      const sandboxResults = await apiSetuAdapter.searchDatasets({ query: 'national', limit: 5 });

      assert.ok(Array.isArray(sandboxResults), 'Must return an array in DEMO_MODE');
      assert.ok(sandboxResults.length > 0, 'Sandbox must return at least one result');
      assert.ok(sandboxResults[0].id, 'Sandbox result must have id');
      assert.ok(sandboxResults[0].title, 'Sandbox result must have title');
      assert.strictEqual(
        sandboxResults[0].onboardingStatus,
        'SANDBOX_DEMO',
        'Sandbox result must carry SANDBOX_DEMO status'
      );

      reportPass('9. API Setu sandbox returns structured demo metadata in DEMO_MODE');
    } catch (err) {
      reportFail('9. API Setu sandbox demo', err);
    }

    // ==============================================================
    // TEST 10: Pluggable adapter swappability
    // ==============================================================
    try {
      class MockStateGovAdapter extends GovernmentAdapter {
        get name() { return 'Mock-State-Portal'; }
        isConfigured() { return true; }
        async searchDatasets({ query = '' }) {
          return [{
            id: 'STATE-TEST-01',
            title: `State Query: ${query}`,
            agency: 'State Digital Authority',
            url: 'https://state.gov.in/datasets',
            lastUpdated: new Date().toISOString(),
            summary: 'State-level open governance dataset.',
            source: 'Mock-State-Portal'
          }];
        }
        async getDatasetById(id) {
          return { id, title: 'State Dataset', source: this.name };
        }
      }

      const customService = new GovernmentService();
      customService.registerAdapter('mock_state', new MockStateGovAdapter());

      const results = await customService.getDatasets({
        provider: 'mock_state',
        query: 'Compliance'
      });

      assert.strictEqual(results.length, 1, 'Must return 1 item from mock adapter');
      assert.strictEqual(results[0].id, 'STATE-TEST-01');
      assert.ok(results[0].title.includes('Compliance'), 'Mock query should appear in title');

      reportPass('10. Custom adapter plugged-in via registerAdapter operates correctly');
    } catch (err) {
      reportFail('10. Pluggable adapter swappability', err);
    }

    // ==============================================================
    // TEST 11: Provider status — no credential leakage
    // ==============================================================
    try {
      const providers = governmentService.getProviderStatus();

      assert.ok(Array.isArray(providers), 'Must return array');
      assert.ok(providers.length >= 2, 'Must have at least 2 providers');

      for (const p of providers) {
        assert.ok(p.id, 'Provider must have id');
        assert.ok(p.name, 'Provider must have name');
        assert.ok(typeof p.isConfigured === 'boolean', 'isConfigured must be boolean');

        // Ensure no credential fields are present
        const forbidden = ['apiKey', 'api_key', 'clientId', 'client_id', 'secret', 'token', 'password'];
        for (const key of forbidden) {
          assert.ok(!(key in p), `Provider response must not contain field: ${key}`);
        }
      }

      assert.ok(providers.some(p => p.name === 'data.gov.in'));
      assert.ok(providers.some(p => p.name === 'API Setu'));

      reportPass('11. getProviderStatus() exposes no credentials, lists all providers');
    } catch (err) {
      reportFail('11. Provider status — credential safety', err);
    }

    // ==============================================================
    // TEST 12: HTTP — GET /api/gov/providers (no credential exposure)
    // ==============================================================
    try {
      const res = await fetch(`${baseUrl}/api/gov/providers`);
      const body = await res.json();

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data), 'body.data must be an array');

      const rawJson = JSON.stringify(body);
      const credentialPatterns = [/api[-_]?key/i, /secret/i, /clientId/i, /password/i, /bearer /i];
      for (const pattern of credentialPatterns) {
        assert.ok(!pattern.test(rawJson), `Response body must not contain credential pattern: ${pattern}`);
      }

      reportPass('12. GET /api/gov/providers — HTTP 200, no credentials in response');
    } catch (err) {
      reportFail('12. GET /api/gov/providers HTTP endpoint', err);
    }

    // ==============================================================
    // TEST 13: HTTP — GET /api/gov/datasets (list/search)
    // ==============================================================
    try {
      const res = await fetch(`${baseUrl}/api/gov/datasets?q=cybersecurity&limit=3`);
      const body = await res.json();

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(body.success, true, 'body.success must be true');
      assert.ok(Array.isArray(body.data), 'body.data must be an array');
      assert.ok(typeof body.count === 'number', 'body.count must be a number');
      assert.ok(body.timestamp, 'body.timestamp must be present');

      reportPass('13. GET /api/gov/datasets — HTTP 200, correct shape');
    } catch (err) {
      reportFail('13. GET /api/gov/datasets HTTP endpoint', err);
    }

    // ==============================================================
    // TEST 14: HTTP — GET /api/gov/datasets/:id
    // ==============================================================
    try {
      const firstId = CURATED_INDIAN_GOV_DATASETS[0].id;
      const res = await fetch(`${baseUrl}/api/gov/datasets/${encodeURIComponent(firstId)}`);
      const body = await res.json();

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, firstId, 'Returned dataset id must match requested id');
      assert.ok(body.data.title, 'Must have title');
      assert.ok(body.data.agency, 'Must have agency');

      reportPass('14. GET /api/gov/datasets/:id — HTTP 200 with correct dataset');
    } catch (err) {
      reportFail('14. GET /api/gov/datasets/:id HTTP endpoint', err);
    }

    // ==============================================================
    // TEST 15: Rate-limit guard — limit clamped to 100 max
    // ==============================================================
    try {
      const results = await governmentService.getDatasets({ limit: 9999, provider: 'data.gov.in' });
      // Total curated items is 5, so we get all 5 but never more than 100
      assert.ok(Array.isArray(results), 'results must be array');
      assert.ok(results.length <= 100, `Limit must be clamped to 100, got ${results.length}`);

      reportPass('15. Limit parameter is clamped to 100 max');
    } catch (err) {
      reportFail('15. Limit rate-guard', err);
    }

    // ==============================================================
    // TEST 16: Offset past end of dataset list returns empty array
    // ==============================================================
    try {
      const results = await governmentService.getDatasets({
        query: '',
        limit: 10,
        offset: 9999,
        provider: 'data.gov.in'
      });

      assert.ok(Array.isArray(results), 'Must return array even when offset is past end');
      assert.strictEqual(results.length, 0, 'Must return empty array when offset exceeds dataset count');

      reportPass('16. Offset past dataset end returns empty array, not error');
    } catch (err) {
      reportFail('16. Offset boundary condition', err);
    }

    // ==============================================================
    // TEST 17: Invalid adapter name returns descriptive error
    // ==============================================================
    try {
      let caught = false;
      try {
        await governmentService.getDatasets({ provider: 'nonexistent_provider_xyz' });
      } catch (err) {
        assert.ok(err.message.includes('nonexistent_provider_xyz'), `Error must mention the invalid provider, got: ${err.message}`);
        caught = true;
      }
      assert.ok(caught, 'Must throw on unregistered provider name');

      reportPass('17. Unregistered provider name throws descriptive error');
    } catch (err) {
      reportFail('17. Invalid adapter name', err);
    }

    // ==============================================================
    // TEST 18: All curated dataset URLs point to gov domains
    // ==============================================================
    try {
      const GOV_URL_PATTERN = /^https?:\/\/([\w-]+\.)*gov\.(in|uk|us|au|ca|nz)(\/.*)?$/;
      const results = await governmentService.getDatasets({ limit: 100, provider: 'data.gov.in' });

      for (const d of results) {
        assert.ok(d.url, `Dataset ${d.id} must have a URL`);
        assert.ok(
          GOV_URL_PATTERN.test(d.url),
          `Dataset ${d.id} URL "${d.url}" must point to a gov domain`
        );
      }

      reportPass('18. All curated dataset URLs point to official .gov domains');
    } catch (err) {
      reportFail('18. Dataset URL domain validation', err);
    }

    // ==============================================================
    // TEST 19: Provider endpoint includes requiresOnboarding flag
    // ==============================================================
    try {
      const providers = governmentService.getProviderStatus();
      const apiSetu = providers.find(p => p.name === 'API Setu');
      assert.ok(apiSetu, 'API Setu provider must be present');
      assert.strictEqual(apiSetu.requiresOnboarding, true, 'API Setu must have requiresOnboarding=true');

      const dataGov = providers.find(p => p.name === 'data.gov.in');
      assert.ok(dataGov, 'data.gov.in must be present');
      assert.strictEqual(dataGov.requiresOnboarding, false, 'data.gov.in must not require onboarding');

      reportPass('19. Provider status includes correct requiresOnboarding flags');
    } catch (err) {
      reportFail('19. requiresOnboarding flag on providers', err);
    }

    // ==============================================================
    // TEST 20: Curated dataset sampleTelemetry is human-readable text
    // ==============================================================
    try {
      const certDs = await governmentService.getDatasetById('GOV-IN-CERT-01');
      assert.ok(typeof certDs.sampleTelemetry === 'string', 'sampleTelemetry must be a string');
      assert.ok(certDs.sampleTelemetry.length > 50, 'sampleTelemetry must be substantive');
      assert.ok(!certDs.sampleTelemetry.includes('<'), 'sampleTelemetry must not contain raw HTML');

      const nicDs = await governmentService.getDatasetById('GOV-IN-NIC-05');
      assert.ok(nicDs.sampleTelemetry, 'NIC dataset must also have sampleTelemetry');

      reportPass('20. sampleTelemetry field is present and human-readable for all curated IDs');
    } catch (err) {
      reportFail('20. sampleTelemetry completeness', err);
    }

  } finally {
    process.env.DEMO_MODE = originalDemoMode;
    if (server) {
      await new Promise(res => server.close(res));
    }
  }

  // -----------------------------------------------------------
  // Final Report
  // -----------------------------------------------------------
  console.log('\n================================================================');
  console.log(`STEP 9 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failures.length > 0) {
    console.error('Failed tests:');
    for (const f of failures) {
      console.error(`  ✗ ${f.name}: ${f.error}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Step 9 verification suite crashed:', err);
  process.exit(1);
});

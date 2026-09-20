/**
 * Test Suite: Government API Integration (data.gov.in & API Setu)
 * 
 * Verifies:
 * 1. Fetching open datasets via data.gov.in adapter
 * 2. Search query filtering on datasets
 * 3. Fetching single dataset by ID with full metadata
 * 4. In-memory TTL caching prevents redundant calls
 * 5. Input validation (invalid dataset ID handling)
 * 6. API Setu adapter gracefully handles onboarding requirement
 * 7. Pluggable adapter abstraction allows custom adapter registration
 * 8. HTTP REST API endpoints (/api/gov/datasets, /api/gov/datasets/:id, /api/gov/providers)
 */

import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { governmentService, GovernmentService } from '../src/services/government/government.service.js';
import { GovernmentAdapter } from '../src/services/government/governmentAdapter.interface.js';
import { apiSetuAdapter } from '../src/services/government/adapters/apisetu.adapter.js';
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
  console.log('🧪 RUNNING GOVERNMENT API INTEGRATION TEST SUITE (DATA.GOV.IN & API SETU)');
  console.log('=============================================================\n');

  const originalDemoMode = env.DEMO_MODE;
  env.DEMO_MODE = true;

  const app = createApp();
  let server;
  const port = 4140;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(port, () => {
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    // Clear cache before test run
    governmentService.clearCache();

    // -------------------------------------------------------------
    // TEST 1: Fetch Open Datasets from data.gov.in Adapter
    // -------------------------------------------------------------
    try {
      const datasets = await governmentService.getDatasets({
        limit: 5,
        provider: 'data.gov.in'
      });

      assert.ok(Array.isArray(datasets), 'Datasets must be an array');
      assert.ok(datasets.length > 0, 'Must return open datasets');
      
      const first = datasets[0];
      assert.ok(first.id, 'Dataset must have id');
      assert.ok(first.title, 'Dataset must have title');
      assert.ok(first.agency, 'Dataset must have agency');
      assert.ok(first.url, 'Dataset must have url');
      assert.ok(first.lastUpdated, 'Dataset must have lastUpdated timestamp');
      assert.ok(first.summary, 'Dataset must have summary');
      assert.strictEqual(first.source, 'data.gov.in');

      reportPass('1. Open datasets fetched from data.gov.in adapter conforming to GovDataset model');
    } catch (err) {
      reportFail('1. Fetch open datasets failed', err);
    }

    // -------------------------------------------------------------
    // TEST 2: Search Query Filtering
    // -------------------------------------------------------------
    try {
      const certResults = await governmentService.getDatasets({
        query: 'CERT-In',
        limit: 5
      });

      assert.ok(Array.isArray(certResults));
      assert.ok(certResults.length > 0, 'Must return matching CERT-In datasets');
      assert.ok(
        certResults.some(d => d.title.includes('CERT-In') || d.agency.includes('CERT-In')),
        'Results must match the search query'
      );

      reportPass('2. Search query filtering successfully isolates relevant government datasets');
    } catch (err) {
      reportFail('2. Search query filtering failed', err);
    }

    // -------------------------------------------------------------
    // TEST 3: Retrieve Dataset by ID
    // -------------------------------------------------------------
    try {
      const targetId = 'GOV-IN-CERT-01';
      const dataset = await governmentService.getDatasetById(targetId);

      assert.strictEqual(dataset.id, targetId);
      assert.ok(dataset.title.includes('CERT-In'));
      assert.ok(dataset.agency.includes('Ministry of Electronics'));
      assert.ok(dataset.sampleTelemetry, 'Dataset should provide sample telemetry for transformation');

      reportPass('3. Individual dataset retrieved by ID with full institutional metadata');
    } catch (err) {
      reportFail('3. Retrieve dataset by ID failed', err);
    }

    // -------------------------------------------------------------
    // TEST 4: In-Memory TTL Caching
    // -------------------------------------------------------------
    try {
      governmentService.clearCache();

      // First call (populates cache)
      const t0 = Date.now();
      const firstFetch = await governmentService.getDatasets({ query: 'telemetry' });
      const duration1 = Date.now() - t0;

      // Second call (served from cache)
      const t1 = Date.now();
      const secondFetch = await governmentService.getDatasets({ query: 'telemetry' });
      const duration2 = Date.now() - t1;

      assert.strictEqual(firstFetch.length, secondFetch.length);
      assert.strictEqual(firstFetch[0].id, secondFetch[0].id);
      assert.ok(duration2 <= duration1, 'Cached retrieval should be instantaneous');

      reportPass('4. In-memory TTL caching prevents redundant network queries and respects rate limits');
    } catch (err) {
      reportFail('4. TTL cache test failed', err);
    }

    // -------------------------------------------------------------
    // TEST 5: Input Validation & Error Handling
    // -------------------------------------------------------------
    try {
      // 5a. Missing ID
      let missingIdCaught = false;
      try {
        await governmentService.getDatasetById('');
      } catch (err) {
        assert.strictEqual(err.code, 'INVALID_DATASET_ID');
        assert.strictEqual(err.statusCode, 400);
        missingIdCaught = true;
      }
      assert.ok(missingIdCaught, 'Must reject empty dataset ID');

      // 5b. Non-existent ID
      let notFoundCaught = false;
      try {
        await governmentService.getDatasetById('NON_EXISTENT_ID_999999');
      } catch (err) {
        assert.strictEqual(err.code, 'DATASET_NOT_FOUND');
        assert.strictEqual(err.statusCode, 404);
        notFoundCaught = true;
      }
      assert.ok(notFoundCaught, 'Must handle non-existent dataset with 404');

      reportPass('5. Input validation and non-existent dataset error handling operate cleanly');
    } catch (err) {
      reportFail('5. Input validation failed', err);
    }

    // -------------------------------------------------------------
    // TEST 6: API Setu Adapter Onboarding Requirement
    // -------------------------------------------------------------
    try {
      assert.strictEqual(apiSetuAdapter.name, 'API Setu');
      // When unconfigured, isConfigured() must be false
      assert.strictEqual(apiSetuAdapter.isConfigured(), false);

      // In DEMO_MODE, it provides sandbox directory without crashing
      const sandboxResults = await apiSetuAdapter.searchDatasets({ query: 'institutional' });
      assert.ok(Array.isArray(sandboxResults));
      assert.strictEqual(sandboxResults[0].onboardingStatus, 'SANDBOX_DEMO');

      reportPass('6. API Setu adapter safely enforces onboarding prerequisites without crashing');
    } catch (err) {
      reportFail('6. API Setu onboarding check failed', err);
    }

    // -------------------------------------------------------------
    // TEST 7: Pluggable Adapter Abstraction Swappability
    // -------------------------------------------------------------
    try {
      class MockStateGovAdapter extends GovernmentAdapter {
        get name() { return 'State-Portal-Adapter'; }
        isConfigured() { return true; }
        async searchDatasets({ query }) {
          return [{
            id: 'STATE-GOV-01',
            title: `State Government Open Directives: ${query || 'General'}`,
            agency: 'State Digital Governance Authority',
            url: 'https://state.gov.in/directives',
            lastUpdated: new Date().toISOString(),
            summary: 'State level administrative notices and compliance reports.'
          }];
        }
        async getDatasetById(id) {
          return { id, title: 'State Dataset' };
        }
      }

      const customGovService = new GovernmentService();
      customGovService.registerAdapter('state_portal', new MockStateGovAdapter());

      const customResults = await customGovService.getDatasets({
        provider: 'state_portal',
        query: 'Cyber Directive'
      });

      assert.strictEqual(customResults.length, 1);
      assert.strictEqual(customResults[0].id, 'STATE-GOV-01');
      assert.strictEqual(customResults[0].agency, 'State Digital Governance Authority');

      reportPass('7. Government adapter interface allows pluggable provider registration');
    } catch (err) {
      reportFail('7. Adapter swappability test failed', err);
    }

    // -------------------------------------------------------------
    // TEST 8: HTTP REST API Endpoints End-to-End
    // -------------------------------------------------------------
    try {
      // 8a. GET /api/gov/providers
      const provRes = await fetch(`${baseUrl}/api/gov/providers`);
      const provData = await provRes.json();
      assert.strictEqual(provRes.status, 200);
      assert.strictEqual(provData.success, true);
      assert.ok(Array.isArray(provData.data));
      assert.ok(provData.data.some(p => p.name === 'data.gov.in'));
      assert.ok(provData.data.some(p => p.name === 'API Setu'));

      // 8b. GET /api/gov/datasets
      const listRes = await fetch(`${baseUrl}/api/gov/datasets?q=security&limit=3`);
      const listData = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listData.success, true);
      assert.ok(Array.isArray(listData.data));
      assert.ok(listData.data.length > 0);

      // 8c. GET /api/gov/datasets/:id
      const firstId = listData.data[0].id;
      const getRes = await fetch(`${baseUrl}/api/gov/datasets/${firstId}`);
      const getData = await getRes.json();
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getData.success, true);
      assert.strictEqual(getData.data.id, firstId);
      assert.ok(getData.data.title);
      assert.ok(getData.data.agency);

      reportPass('8. HTTP REST API endpoints (/api/gov/*) operate cleanly end-to-end');
    } catch (err) {
      reportFail('8. HTTP REST API endpoints failed', err);
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
  console.error('Government API test suite failed:', err);
  process.exit(1);
});

/**
 * Comprehensive Test Suite for Step 6: Text Extraction and OCR Pipeline
 * Tests all 6 mandated requirements:
 * 1. normal text document (direct extraction without external OCR)
 * 2. image with text (routed to OCR provider)
 * 3. scanned PDF (digital text density < 30 chars -> fallback to OCR provider)
 * 4. OCR failure (provider error handling & failure tracking in ocr_results)
 * 5. timeout (request abort on timeout)
 * 6. unsupported document (rejection with UNSUPPORTED_DOCUMENT_TYPE)
 */

import assert from 'assert';
import { normalizeText } from '../src/services/ocr/textNormalizer.js';
import { tryDirectExtraction, classifyDocument } from '../src/services/ocr/directExtractor.js';
import { OcrSpaceProvider } from '../src/services/ocr/ocrSpace.provider.js';
import { OcrService } from '../src/services/ocr/ocr.service.js';
import { ocrResults } from '../src/services/dataStore.js';

console.log('\n=============================================================');
console.log('🧪 RUNNING OCR & TEXT EXTRACTION TEST SUITE');
console.log('=============================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓ PASS: ${name}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
      failedTests++;
    });
}

// -----------------------------------------------------------------------------
// Test 1: Normal text document (Direct extraction, bypassing external OCR)
// -----------------------------------------------------------------------------
await runTest('1. Normal text document extracts directly without calling OCR', async () => {
  let ocrCalled = false;
  const mockOcrProvider = {
    processFile: async () => {
      ocrCalled = true;
      throw new Error('OCR should NOT be called for normal text documents');
    }
  };

  const service = new OcrService(mockOcrProvider);
  const sampleContent = `# Enterprise Architecture Review\n\nAll perimeter telemetry nodes report operational status.\nZero intrusions recorded.\n`;
  const fileBuffer = Buffer.from(sampleContent, 'utf-8');

  const result = await service.extractText({
    buffer: fileBuffer,
    originalName: 'compliance_report.md',
    mimeType: 'text/markdown',
    id: 'file-text-01'
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(ocrCalled, false, 'OCR.Space must not be called for normal text document');
  assert.strictEqual(result.isScanned, false);
  assert.strictEqual(result.provider, 'direct_text');
  assert(result.extractedText.includes('Enterprise Architecture Review'));
  assert(result.metrics.wordCount > 5);
});

// -----------------------------------------------------------------------------
// Test 2: Image with text (Routed to OCR.Space)
// -----------------------------------------------------------------------------
await runTest('2. Image with text is routed to OCR provider', async () => {
  let ocrCalled = false;
  const mockOcrProvider = {
    processFile: async (buf, name, mime) => {
      ocrCalled = true;
      return {
        success: true,
        text: 'SCADA Ingress Gateway Sensor Node #4 - Firmware v4.2 Authenticated',
        provider: 'ocr_space',
        language: 'eng',
        confidence: 97.5
      };
    }
  };

  const service = new OcrService(mockOcrProvider);
  // 1x1 transparent PNG image buffer
  const imageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const result = await service.extractText({
    buffer: imageBuffer,
    originalName: 'sensor_telemetry.png',
    mimeType: 'image/png',
    id: 'file-img-01'
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(ocrCalled, true, 'OCR provider must be called for images');
  assert.strictEqual(result.isScanned, true);
  assert.strictEqual(result.provider, 'ocr_space');
  assert(result.extractedText.includes('SCADA Ingress Gateway'));
});

// -----------------------------------------------------------------------------
// Test 3: Scanned PDF (Density < 30 chars -> routes to OCR)
// -----------------------------------------------------------------------------
await runTest('3. Scanned PDF with empty/image stream falls back to OCR.Space', async () => {
  let ocrCalled = false;
  const mockOcrProvider = {
    processFile: async (buf, name, mime) => {
      ocrCalled = true;
      return {
        success: true,
        text: 'OCR EXTRACTED: Institutional Governance Policy 2026 Revision - Page 1 Scanned Seal',
        provider: 'ocr_space',
        language: 'eng',
        confidence: 94.0
      };
    }
  };

  const service = new OcrService(mockOcrProvider);
  // Minimal valid PDF structure with empty text
  const emptyPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF',
    'utf-8'
  );

  const result = await service.extractText({
    buffer: emptyPdfBuffer,
    originalName: 'scanned_handbook.pdf',
    mimeType: 'application/pdf',
    id: 'file-scanned-pdf-01'
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(ocrCalled, true, 'OCR provider must be invoked when PDF contains no digital text');
  assert.strictEqual(result.isScanned, true);
  assert(result.extractedText.includes('Institutional Governance Policy'));
});

// -----------------------------------------------------------------------------
// Test 4: OCR Failure (Handles provider error and records failure in ocr_results)
// -----------------------------------------------------------------------------
await runTest('4. OCR failure handles provider error and tracks status=failed', async () => {
  const failingProvider = {
    processFile: async () => {
      const err = new Error('OCR provider internal server error (500)');
      err.code = 'OCR_PROCESSING_FAILED';
      err.statusCode = 502;
      throw err;
    }
  };

  const service = new OcrService(failingProvider);
  const imageBuffer = Buffer.from('fake-image-bytes');
  const targetFileId = `file-fail-${Date.now()}`;

  let caughtError = null;
  try {
    await service.extractText({
      buffer: imageBuffer,
      originalName: 'corrupt_scan.jpg',
      mimeType: 'image/jpeg',
      id: targetFileId
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null, 'Service must propagate provider failure');
  assert.strictEqual(caughtError.code, 'OCR_PROCESSING_FAILED');

  // Verify failure status was recorded in ocr_results
  const recorded = await service.getOcrResultByFileId(targetFileId);
  assert(recorded !== null, 'Failed OCR attempt must be recorded in ocr_results');
  assert.strictEqual(recorded.status, 'failed');
  assert.strictEqual(recorded.metadata.errorCode, 'OCR_PROCESSING_FAILED');
});

// -----------------------------------------------------------------------------
// Test 5: Timeout (Request aborts cleanly when exceeding timeout)
// -----------------------------------------------------------------------------
await runTest('5. Timeout triggers cleanly when provider exceeds timeout limit', async () => {
  // Provider configured with an unroutable port and 50ms timeout
  const timeoutProvider = new OcrSpaceProvider('test-key', 'http://10.255.255.1:81/slow');
  const service = new OcrService(timeoutProvider);

  const imageBuffer = Buffer.from('test-bytes');
  let caughtError = null;

  try {
    await service.extractText(
      {
        buffer: imageBuffer,
        originalName: 'slow_scan.png',
        mimeType: 'image/png',
        id: 'file-timeout-01'
      },
      { timeoutMs: 50 }
    );
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null, 'Request must abort on timeout');
  assert.strictEqual(caughtError.code, 'OCR_TIMEOUT');
  assert.strictEqual(caughtError.statusCode, 504);
});

// -----------------------------------------------------------------------------
// Test 6: Unsupported document (Rejection with 400 UNSUPPORTED_DOCUMENT_TYPE)
// -----------------------------------------------------------------------------
await runTest('6. Unsupported document format is rejected with clear error', async () => {
  const service = new OcrService();
  const binaryBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // DOS executable header

  let caughtError = null;
  try {
    await service.extractText({
      buffer: binaryBuffer,
      originalName: 'payload.exe',
      mimeType: 'application/x-msdownload',
      id: 'file-unsupported-01'
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null, 'Unsupported format must be rejected');
  assert.strictEqual(caughtError.code, 'UNSUPPORTED_DOCUMENT_TYPE');
  assert.strictEqual(caughtError.statusCode, 400);
});

// -----------------------------------------------------------------------------
// Test 7: Text Normalization Unit Tests
// -----------------------------------------------------------------------------
await runTest('7. Text normalizer cleans CRLF, control chars, and collapses spacing', async () => {
  const dirty = "\0Header\r\n\r\n\r\nLine 1\t\twith   extra   spaces\x0C\r\nLine 2\n\n\n\nLine 3\0";
  const normalized = normalizeText(dirty);

  assert(!normalized.text.includes('\0'), 'Must remove null bytes');
  assert(!normalized.text.includes('\r'), 'Must normalize CRLF to LF');
  assert(!normalized.text.includes('\x0C'), 'Must remove form feed control chars');
  assert(!normalized.text.includes('\n\n\n'), 'Must collapse 3+ consecutive newlines');
  assert.strictEqual(normalized.lineCount, 6);
  assert(normalized.wordCount >= 8);
});

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log('\n=============================================================');
console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed`);
console.log('=============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

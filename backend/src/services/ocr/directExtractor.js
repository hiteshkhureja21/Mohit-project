/**
 * Direct Text Extractor
 * Extracts digital text directly from electronic documents (PDF, TXT, MD, CSV, JSON)
 * without unnecessarily sending digital documents through external OCR engines.
 */

import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let PDFParse;
try {
  const pdfModule = require('pdf-parse');
  PDFParse = pdfModule.PDFParse;
} catch (err) {
  console.warn('[DirectExtractor] pdf-parse load notice:', err.message);
}

export const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.log'];
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp'];
export const PDF_EXTENSIONS = ['.pdf'];

export const SUPPORTED_EXTENSIONS = [
  ...TEXT_EXTENSIONS,
  ...PDF_EXTENSIONS,
  ...IMAGE_EXTENSIONS
];

/**
 * Determines file classification and extraction strategy.
 */
export function classifyDocument(filename = '', mimeType = '') {
  const ext = path.extname(filename).toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (TEXT_EXTENSIONS.includes(ext) || mime.startsWith('text/') || mime === 'application/json' || mime === 'application/csv') {
    return { type: 'TEXT', requiresOcr: false, ext };
  }

  if (PDF_EXTENSIONS.includes(ext) || mime === 'application/pdf') {
    return { type: 'PDF', requiresOcr: false, ext };
  }

  if (IMAGE_EXTENSIONS.includes(ext) || mime.startsWith('image/')) {
    return { type: 'IMAGE', requiresOcr: true, ext };
  }

  return { type: 'UNSUPPORTED', requiresOcr: false, ext };
}

/**
 * Attempts direct text extraction for digital text files and electronic PDFs.
 * If a PDF contains no digital text layer (scanned), flags it for OCR fallback.
 */
export async function tryDirectExtraction(fileBuffer, originalName, mimeType) {
  const classification = classifyDocument(originalName, mimeType);

  // 1. Plain text formats
  if (classification.type === 'TEXT') {
    const rawText = fileBuffer.toString('utf-8');
    return {
      success: true,
      text: rawText,
      provider: 'direct_text',
      isScanned: false,
      pageCount: 1,
      language: 'eng'
    };
  }

  // 2. PDF Documents
  if (classification.type === 'PDF') {
    if (PDFParse) {
      let parser;
      try {
        parser = new PDFParse({ data: fileBuffer, verbosity: 0 });
        const result = await parser.getText();
        const extractedText = (result?.text || '').trim();
        const pageCount = result?.total || result?.pages?.length || 1;

        // Scanned PDF detection: if extracted digital text density is less than 30 characters
        if (extractedText.length >= 30) {
          return {
            success: true,
            text: extractedText,
            provider: 'pdf_parse',
            isScanned: false,
            pageCount,
            language: 'eng'
          };
        }

        // Less than 30 characters: This is a scanned PDF image requiring OCR
        return {
          success: false,
          text: '',
          provider: 'ocr_space',
          isScanned: true,
          pageCount,
          reason: 'SCANNED_PDF_REQUIRES_OCR'
        };
      } catch (err) {
        console.warn('[DirectExtractor] Digital PDF parse failed, falling back to OCR:', err.message);
        return {
          success: false,
          text: '',
          provider: 'ocr_space',
          isScanned: true,
          pageCount: 1,
          reason: 'PDF_PARSE_FALLBACK_TO_OCR'
        };
      } finally {
        if (parser && typeof parser.destroy === 'function') {
          try {
            await parser.destroy();
          } catch {}
        }
      }
    }

    // If PDFParse is unavailable, treat PDF as needing OCR
    return {
      success: false,
      text: '',
      provider: 'ocr_space',
      isScanned: true,
      pageCount: 1,
      reason: 'PDF_PARSER_UNAVAILABLE'
    };
  }

  // 3. Images always require OCR
  if (classification.type === 'IMAGE') {
    return {
      success: false,
      text: '',
      provider: 'ocr_space',
      isScanned: true,
      pageCount: 1,
      reason: 'IMAGE_REQUIRES_OCR'
    };
  }

  // 4. Unsupported documents
  return {
    success: false,
    text: '',
    provider: 'unsupported',
    isScanned: false,
    pageCount: 0,
    isUnsupported: true,
    reason: `Unsupported document format '${classification.ext || 'unknown'}'.`
  };
}

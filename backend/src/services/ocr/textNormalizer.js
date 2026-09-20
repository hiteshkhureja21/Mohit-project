/**
 * Text Normalization Engine
 * Cleans, sanitizes, and normalizes raw text extracted from documents and OCR engines.
 */

export function normalizeText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      text: '',
      characterCount: 0,
      wordCount: 0,
      lineCount: 0
    };
  }

  let cleaned = rawText;

  // 1. Strip null bytes and non-printable control characters (retain \t and \n)
  cleaned = cleaned.replace(/\0/g, '');
  cleaned = cleaned.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Normalize Windows (\r\n) and classic Mac (\r) line breaks to standard Unix (\n)
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Normalize horizontal whitespace per line (multiple tabs/spaces converted to single space)
  cleaned = cleaned
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');

  // 4. Collapse runs of 3 or more consecutive newlines into 2 (paragraph break)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 5. Trim leading and trailing document whitespace
  cleaned = cleaned.trim();

  // 6. Calculate text metrics
  const characterCount = cleaned.length;
  const wordCount = cleaned.length > 0 ? cleaned.split(/\s+/).filter(Boolean).length : 0;
  const lineCount = cleaned.length > 0 ? cleaned.split('\n').length : 0;

  return {
    text: cleaned,
    characterCount,
    wordCount,
    lineCount
  };
}

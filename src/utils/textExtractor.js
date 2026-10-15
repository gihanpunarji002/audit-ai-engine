import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import logger from './logger.js';

/**
 * Utility to extract clean raw text from uploaded files (PDF, TXT, MD, CSV, JSON, HTML)
 */
export const extractTextFromFile = async (filePath, mimeType) => {
  const resolvedPath = path.resolve(filePath);
  const buffer = await fs.readFile(resolvedPath);

  // 1. PDF Documents
  if (mimeType === 'application/pdf') {
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      if (textResult && typeof textResult === 'string' && textResult.trim().length > 0) {
        return textResult.trim();
      }
      logger.warn(`PDF parser returned empty text for ${filePath}. Might be a scanned image PDF.`);
      return `[Scanned PDF Document: ${path.basename(filePath)}]`;
    } catch (err) {
      logger.error(`Error parsing PDF text from ${filePath}`, { error: err.message });
      return `[PDF Text Extraction Unavailable: ${err.message}]`;
    }
  }

  // 2. Images (JPEG, PNG, WEBP, etc.)
  if (mimeType.startsWith('image/')) {
    // Images are primarily visual; for RAG context, provide structural tag
    return `[Forensic Image Document: ${path.basename(filePath)}, MIME: ${mimeType}, Size: ${buffer.length} bytes]`;
  }

  // 3. Plain text, Markdown, CSV, JSON, HTML, Code
  try {
    const utf8Text = buffer.toString('utf8');
    return utf8Text.trim();
  } catch (err) {
    logger.error(`Error reading text file from ${filePath}`, { error: err.message });
    return buffer.toString('ascii').trim();
  }
};

export default extractTextFromFile;

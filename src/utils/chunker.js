/**
 * Recursive character and sentence-aware text chunker for RAG vectorization.
 *
 * @param {string} text - Raw document text
 * @param {Object} options
 * @param {number} [options.chunkSize=1000] - Target characters per chunk
 * @param {number} [options.chunkOverlap=200] - Overlap characters between chunks
 * @returns {Array<{ chunkIndex: number, content: string, tokenEstimate: number }>}
 */
export const splitTextIntoChunks = (text, { chunkSize = 1000, chunkOverlap = 200 } = {}) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const cleanText = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
  if (cleanText.length <= chunkSize) {
    return [
      {
        chunkIndex: 0,
        content: cleanText,
        tokenEstimate: Math.ceil(cleanText.length / 4),
      },
    ];
  }

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= cleanText.length) {
      const finalSlice = cleanText.substring(startIndex).trim();
      if (finalSlice.length > 0) {
        chunks.push({
          chunkIndex,
          content: finalSlice,
          tokenEstimate: Math.ceil(finalSlice.length / 4),
        });
      }
      break;
    }

    // Try finding natural break boundaries (paragraph, newline, period, space)
    const windowSlice = cleanText.substring(startIndex, endIndex);
    let breakOffset = -1;

    // 1. Double newline (paragraph)
    const lastParagraph = windowSlice.lastIndexOf('\n\n');
    if (lastParagraph > chunkSize * 0.5) {
      breakOffset = lastParagraph + 2;
    } else {
      // 2. Sentence boundary (. ! ?)
      const lastSentence = Math.max(
        windowSlice.lastIndexOf('. '),
        windowSlice.lastIndexOf('! '),
        windowSlice.lastIndexOf('? ')
      );
      if (lastSentence > chunkSize * 0.5) {
        breakOffset = lastSentence + 2;
      } else {
        // 3. Single newline
        const lastNewline = windowSlice.lastIndexOf('\n');
        if (lastNewline > chunkSize * 0.5) {
          breakOffset = lastNewline + 1;
        } else {
          // 4. Word boundary (space)
          const lastSpace = windowSlice.lastIndexOf(' ');
          if (lastSpace > chunkSize * 0.5) {
            breakOffset = lastSpace + 1;
          }
        }
      }
    }

    const actualEndIndex = breakOffset !== -1 ? startIndex + breakOffset : endIndex;
    const chunkContent = cleanText.substring(startIndex, actualEndIndex).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        chunkIndex,
        content: chunkContent,
        tokenEstimate: Math.ceil(chunkContent.length / 4),
      });
      chunkIndex++;
    }

    // Advance with overlap
    startIndex = actualEndIndex - chunkOverlap;
    if (startIndex <= 0 || startIndex >= cleanText.length) {
      break;
    }
  }

  return chunks;
};

export default splitTextIntoChunks;

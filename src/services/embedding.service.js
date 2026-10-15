import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class EmbeddingService {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.modelName = config.gemini.embeddingModel || 'text-embedding-004';
    this.client = null;
    this.dimension = 768; // Standard dimension for text-embedding-004

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        logger.info(`Gemini Embedding client initialized using model: ${this.modelName}`);
      } catch (err) {
        logger.error('Failed to initialize Gemini embedding client', { error: err.message });
      }
    }
  }

  /**
   * Generate vector embedding for a single text string
   * @param {string} text 
   * @returns {Promise<number[]>} Float array of 768 dimensions
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Array(this.dimension).fill(0);
    }

    if (!this.client || !this.apiKey) {
      return this._generateSimulatedEmbedding(text);
    }

    try {
      const response = await this.client.models.embedContent({
        model: this.modelName,
        contents: text,
      });

      if (response && response.embedding && response.embedding.values) {
        return response.embedding.values;
      }

      logger.warn('Unexpected embedding response format from Gemini. Using simulated fallback.');
      return this._generateSimulatedEmbedding(text);
    } catch (error) {
      logger.error('Failed to generate embedding with Gemini API', { error: error.message });
      return this._generateSimulatedEmbedding(text);
    }
  }

  /**
   * Generate embeddings for an array of texts in parallel with controlled batches
   * @param {string[]} texts 
   * @param {number} [batchSize=10]
   * @returns {Promise<number[][]>}
   */
  async generateBatchEmbeddings(texts, batchSize = 10) {
    const results = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((text) => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Deterministic simulated normalized embedding vector (768-dim) for offline dev/testing
   * @param {string} text 
   * @returns {number[]}
   */
  _generateSimulatedEmbedding(text) {
    const vector = new Array(this.dimension).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = crypto.createHash('md5').update(word).digest();
      for (let j = 0; j < 16; j++) {
        const index = (hash[j] * 31 + j * 17) % this.dimension;
        vector[index] += (hash[j] - 128) / 128.0;
      }
    }

    // L2 Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1.0;
    return vector.map((v) => Number((v / norm).toFixed(6)));
  }
}

export default new EmbeddingService();

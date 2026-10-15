import { db, FieldValue } from '../config/firebase.js';
import logger from '../utils/logger.js';

class RagRepository {
  constructor() {
    this.chunksCollection = db.collection('document_chunks');
    this.queriesCollection = db.collection('rag_queries');
  }

  /**
   * Batch save document chunks with Cloud Firestore Vector embeddings
   * @param {Array<Object>} chunks 
   */
  async saveDocumentChunks(chunks) {
    if (!chunks || chunks.length === 0) return [];

    // Firestore batch writes are capped at 500 operations per batch
    const BATCH_SIZE = 400;
    const now = new Date().toISOString();
    const inserted = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const slice = chunks.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const chunk of slice) {
        const docId = `${chunk.documentId}_${chunk.chunkIndex}`;
        const docRef = this.chunksCollection.doc(docId);

        const chunkData = {
          id: docId,
          document_id: String(chunk.documentId),
          organization_id: String(chunk.organizationId),
          chunk_index: Number(chunk.chunkIndex),
          content: chunk.content,
          token_estimate: chunk.tokenEstimate || 0,
          metadata: chunk.metadata || {},
          created_at: now,
        };

        // If embedding vector is provided, store as Firestore FieldValue.vector
        if (chunk.embedding && Array.isArray(chunk.embedding)) {
          try {
            chunkData.embedding = FieldValue.vector(chunk.embedding);
          } catch (vecErr) {
            logger.warn(`Could not set FieldValue.vector: ${vecErr.message}`);
          }
          chunkData.embedding_array = chunk.embedding;
        }

        batch.set(docRef, chunkData, { merge: true });
        inserted.push({ id: docId, document_id: chunk.documentId, chunk_index: chunk.chunkIndex });
      }

      await batch.commit();
    }

    logger.info(`Saved ${inserted.length} chunks with vector embeddings to Firestore collection 'document_chunks'`);
    return inserted;
  }

  /**
   * Cloud Firestore KNN Vector Search
   * Finds nearest chunks using Firestore findNearest (Cosine distance)
   * @param {Object} params
   */
  async findNearestChunks({ organizationId, queryEmbedding, topK = 4, documentIdFilter = null }) {
    try {
      let query = this.chunksCollection.where('organization_id', '==', String(organizationId));

      if (documentIdFilter) {
        query = query.where('document_id', '==', String(documentIdFilter));
      }

      // Execute Cloud Firestore native KNN vector search
      const vectorQuery = query.findNearest('embedding', FieldValue.vector(queryEmbedding), {
        limit: topK,
        distanceMeasure: 'COSINE',
        distanceResultField: 'vector_distance',
      });

      const snapshot = await vectorQuery.get();

      if (!snapshot.empty) {
        logger.info(`Firestore KNN returned ${snapshot.docs.length} vector matches for Org ${organizationId}`);
        return snapshot.docs.map((doc) => {
          const data = doc.data();
          const distance = typeof data.vector_distance === 'number' ? data.vector_distance : 0;
          const similarityScore = Math.max(0, 1 - distance);

          return {
            id: doc.id,
            content: data.content,
            metadata: {
              documentId: data.document_id,
              organizationId: data.organization_id,
              chunkIndex: data.chunk_index,
              ...(data.metadata || {}),
            },
            distance,
            relevanceScore: Number(similarityScore.toFixed(4)),
          };
        });
      }
    } catch (error) {
      // If Firestore vector index is building or not yet deployed in Google Cloud,
      // fallback to cosine similarity calculation over stored embedding arrays
      logger.warn(`Firestore native findNearest fallback: ${error.message}. Computing in-memory cosine matches.`);
    }

    // In-memory fallback over stored chunks
    return this._fallbackCosineSearch(organizationId, queryEmbedding, topK, documentIdFilter);
  }

  /**
   * Fallback cosine similarity search over Firestore documents
   */
  async _fallbackCosineSearch(organizationId, queryEmbedding, topK, documentIdFilter) {
    let query = this.chunksCollection.where('organization_id', '==', String(organizationId));
    if (documentIdFilter) {
      query = query.where('document_id', '==', String(documentIdFilter));
    }

    const snapshot = await query.limit(100).get();
    if (snapshot.empty) return [];

    const candidates = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const embedding = data.embedding_array || (data.embedding && data.embedding.values ? data.embedding.values : null);
      if (embedding) {
        const score = this._cosineSimilarity(queryEmbedding, embedding);
        candidates.push({
          id: doc.id,
          content: data.content,
          metadata: {
            documentId: data.document_id,
            organizationId: data.organization_id,
            chunkIndex: data.chunk_index,
            ...(data.metadata || {}),
          },
          distance: Number((1 - score).toFixed(4)),
          relevanceScore: Number(score.toFixed(4)),
        });
      }
    }

    candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return candidates.slice(0, topK);
  }

  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find all chunks for a document
   * @param {string|number} documentId 
   */
  async findChunksByDocumentId(documentId) {
    const snapshot = await this.chunksCollection
      .where('document_id', '==', String(documentId))
      .orderBy('chunk_index', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Delete all chunks for a document
   * @param {string|number} documentId 
   */
  async deleteChunksByDocumentId(documentId) {
    const snapshot = await this.chunksCollection
      .where('document_id', '==', String(documentId))
      .get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
  }

  /**
   * Log an audit RAG query, answer, and retrieved chunk citations
   * @param {Object} queryData 
   */
  async logRagQuery({
    organization_id,
    user_id,
    document_id = null,
    query_text,
    answer_text,
    retrieved_chunks = [],
    model_used = null,
  }) {
    const docRef = this.queriesCollection.doc();
    const data = {
      id: docRef.id,
      organization_id: String(organization_id),
      user_id: user_id ? String(user_id) : null,
      document_id: document_id ? String(document_id) : null,
      query_text,
      answer_text,
      retrieved_chunks,
      model_used,
      created_at: new Date().toISOString(),
    };

    await docRef.set(data);
    return data;
  }

  /**
   * Find query history for an organization
   * @param {string|number} organizationId 
   * @param {Object} options 
   */
  async findQueriesByOrganization(organizationId, { limit = 20, offset = 0 } = {}) {
    let query = this.queriesCollection
      .where('organization_id', '==', String(organizationId))
      .orderBy('created_at', 'desc');

    if (offset > 0) {
      query = query.offset(offset);
    }
    query = query.limit(limit);

    const snapshot = await query.get();
    const queries = [];

    for (const doc of snapshot.docs) {
      const data = { id: doc.id, ...doc.data() };
      if (data.user_id) {
        const userDoc = await db.collection('users').doc(data.user_id).get();
        if (userDoc.exists) {
          data.user_first_name = userDoc.data().first_name;
          data.user_last_name = userDoc.data().last_name;
          data.user_email = userDoc.data().email;
        }
      }
      queries.push(data);
    }

    return queries;
  }

  /**
   * Count queries for an organization
   * @param {string|number} organizationId 
   */
  async countQueriesByOrganization(organizationId) {
    const countSnap = await this.queriesCollection
      .where('organization_id', '==', String(organizationId))
      .count()
      .get();
    return countSnap.data().count || 0;
  }
}

export default new RagRepository();

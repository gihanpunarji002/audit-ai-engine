import ragService from '../services/rag.service.js';
import documentRepository from '../repositories/document.repository.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import HttpStatus from '../constants/httpStatus.js';

export class RagController {
  /**
   * POST /api/v1/rag/documents/:documentId/index
   * Index document text into Cloud Firestore Vector store
   */
  indexDocument = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const result = await ragService.indexDocument(documentId, req.user.id);
    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.created(result, 'Document indexed into Cloud Firestore vector store successfully'));
  });

  /**
   * POST /api/v1/rag/organizations/:orgId/query
   * Semantic Q&A across all organization documents using Firestore KNN
   */
  queryOrganization = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const { query: queryText, top_k } = req.body;

    if (!queryText) {
      throw ApiError.badRequest('A query string is required');
    }

    const result = await ragService.queryKnowledgeBase({
      organizationId: orgId,
      queryText,
      userId: req.user.id,
      topK: top_k,
    });

    return res.json(ApiResponse.success(result, 'Audit inquiry processed successfully'));
  });

  /**
   * POST /api/v1/rag/documents/:documentId/query
   * Semantic Q&A scoped to a single document
   */
  queryDocument = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { query: queryText, top_k } = req.body;

    if (!queryText) {
      throw ApiError.badRequest('A query string is required');
    }

    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    const result = await ragService.queryKnowledgeBase({
      organizationId: document.organization_id,
      queryText,
      userId: req.user.id,
      documentId: document.id,
      topK: top_k,
    });

    return res.json(ApiResponse.success(result, 'Document inquiry processed successfully'));
  });

  /**
   * GET /api/v1/rag/organizations/:orgId/history
   * Retrieve query conversation history
   */
  getQueryHistory = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const { page, limit } = req.query;
    const history = await ragService.getQueryHistory(orgId, req.user.id, { page, limit });
    return res.json(ApiResponse.success(history, 'Audit query history retrieved successfully'));
  });

  /**
   * GET /api/v1/rag/organizations/:orgId/status
   * Check Cloud Firestore Vector Store status
   */
  getVectorStatus = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const status = await ragService.getVectorStatus(orgId, req.user.id);
    return res.json(ApiResponse.success(status, 'Vector store status retrieved'));
  });

  // Alias for backward compatibility
  getChromaStatus = this.getVectorStatus;
}

export default new RagController();

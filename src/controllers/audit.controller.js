import path from 'path';
import fs from 'fs';
import auditService from '../services/audit.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import HttpStatus from '../constants/httpStatus.js';

export class AuditController {
  /**
   * POST /api/v1/audits/upload
   * Upload file and immediately run Google Gemini AI audit
   */
  uploadDocument = asyncHandler(async (req, res) => {
    const file = req.file;
    const { organization_id, run_audit = 'true' } = req.body;

    const result = await auditService.uploadAndAuditDocument({
      file,
      organizationId: organization_id,
      userId: req.user.id,
      runAuditNow: run_audit !== 'false',
    });

    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.created(result, 'Document uploaded and analyzed successfully'));
  });

  /**
   * POST /api/v1/audits/:documentId/analyze
   * Trigger Google Gemini AI audit on an existing document
   */
  triggerAudit = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const report = await auditService.analyzeDocument(documentId, req.user.id);
    return res.json(ApiResponse.success(report, 'Audit analysis completed successfully'));
  });

  /**
   * GET /api/v1/audits/:id
   * Get audit report by report ID
   */
  getAuditReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const report = await auditService.getAuditReport(id, req.user.id);
    return res.json(ApiResponse.success(report, 'Audit report retrieved successfully'));
  });

  /**
   * GET /api/v1/audits/document/:documentId
   * Get audit report for a specific document
   */
  getAuditByDocumentId = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const report = await auditService.getAuditReportByDocumentId(documentId, req.user.id);
    return res.json(ApiResponse.success(report, 'Document audit report retrieved successfully'));
  });

  /**
   * GET /api/v1/audits/organization/:orgId
   * List all audits for an organization with pagination
   */
  getOrganizationAudits = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const { page, limit, status, verdict, risk_level } = req.query;
    const result = await auditService.getOrganizationAudits(orgId, req.user.id, {
      page,
      limit,
      status,
      verdict,
      risk_level,
    });
    return res.json(ApiResponse.success(result, 'Organization audit reports retrieved successfully'));
  });

  /**
   * GET /api/v1/documents/organization/:orgId
   * List all uploaded documents for an organization
   */
  getOrganizationDocuments = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const { page, limit, status, file_type } = req.query;
    const result = await auditService.getOrganizationDocuments(orgId, req.user.id, {
      page,
      limit,
      status,
      file_type,
    });
    return res.json(ApiResponse.success(result, 'Organization documents retrieved successfully'));
  });

  /**
   * GET /api/v1/documents/:id
   * Get single document metadata
   */
  getDocumentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const document = await auditService.getDocumentById(id, req.user.id);
    return res.json(ApiResponse.success(document, 'Document retrieved successfully'));
  });

  /**
   * GET /api/v1/documents/:id/download
   * Download original uploaded document file
   */
  downloadDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const document = await auditService.getDocumentById(id, req.user.id);

    // If document is stored in Firebase Storage with signed URL, redirect to it
    if (document.download_url && document.download_url.startsWith('http')) {
      return res.redirect(document.download_url);
    }

    const resolvedPath = path.resolve(document.file_path);

    if (!fs.existsSync(resolvedPath)) {
      throw ApiError.notFound('Document file not found on server storage');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Type', document.mime_type);
    const fileStream = fs.createReadStream(resolvedPath);
    return fileStream.pipe(res);
  });
}

export default new AuditController();

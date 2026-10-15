import path from 'path';
import fs from 'fs/promises';
import documentRepository from '../repositories/document.repository.js';
import auditRepository from '../repositories/audit.repository.js';
import organizationRepository from '../repositories/organization.repository.js';
import geminiService from './gemini.service.js';
import ragService from './rag.service.js';
import storageService from './storage.service.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { AuditStatus, DocumentStatus } from '../constants/audit.js';

class AuditService {
  /**
   * Upload a document into an organization workspace and immediately execute Gemini AI audit
   * @param {Object} uploadData 
   */
  async uploadAndAuditDocument({ file, organizationId, userId, runAuditNow = true }) {
    if (!file) {
      throw ApiError.badRequest('No document file was uploaded');
    }

    if (!organizationId) {
      throw ApiError.badRequest('Organization ID is required');
    }

    // 1. Verify user is a member of the organization
    const membership = await organizationRepository.findMember(organizationId, userId);
    if (!membership) {
      // Clean up uploaded file on disk if unauthorized
      await fs.unlink(file.path).catch(() => {});
      throw ApiError.forbidden('You do not have permission to upload files to this organization');
    }

    // 2. Upload to Firebase Storage
    const storageDest = `organizations/${organizationId}/documents/${file.filename}`;
    const storageResult = await storageService.uploadFile({
      localFilePath: file.path,
      destination: storageDest,
      mimeType: file.mimetype,
    });

    // 3. Persist document record in Cloud Firestore
    const document = await documentRepository.create({
      organization_id: organizationId,
      uploaded_by: userId,
      original_name: file.originalname,
      stored_filename: file.filename,
      file_path: file.path,
      storage_path: storageResult.storagePath,
      download_url: storageResult.downloadUrl,
      file_size: file.size,
      mime_type: file.mimetype,
      file_type: file.auditFileType || 'document',
      metadata: {
        encoding: file.encoding,
        destination: file.destination,
        isCloudStorage: storageResult.isCloudStorage,
      },
    });

    logger.info(`Document uploaded: ${document.original_name} (ID: ${document.id}) in Org ${organizationId}`);

    // 3. Run audit if requested
    let auditReport = null;
    if (runAuditNow) {
      auditReport = await this.analyzeDocument(document.id, userId);
    }

    // 4. Automatically trigger RAG vector indexing in the background
    ragService.indexDocument(document.id, userId).catch((err) => {
      logger.warn(`Background RAG indexing skipped/failed for Document ${document.id}: ${err.message}`);
    });

    return {
      document,
      auditReport,
    };
  }

  /**
   * Execute Google Gemini AI audit on an existing document
   * @param {number|string} documentId 
   * @param {number|string} userId 
   */
  async analyzeDocument(documentId, userId) {
    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    // Verify organization membership
    const membership = await organizationRepository.findMember(document.organization_id, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have permission to audit documents in this organization');
    }

    // Set document status to processing
    await documentRepository.updateStatus(document.id, DocumentStatus.PROCESSING);

    try {
      // Call Gemini AI service
      const analysis = await geminiService.auditDocument({
        filePath: path.resolve(document.file_path),
        mimeType: document.mime_type,
        originalName: document.original_name,
        fileType: document.file_type,
      });

      // Save complete audit report
      const report = await auditRepository.create({
        document_id: document.id,
        organization_id: document.organization_id,
        audited_by: userId,
        status: AuditStatus.COMPLETED,
        summary: analysis.summary,
        authenticity_verdict: analysis.authenticity_verdict,
        authenticity_score: analysis.authenticity_score,
        is_fake: analysis.is_fake,
        is_spam: analysis.is_spam,
        faults: analysis.faults,
        security_measures: analysis.security_measures,
        overall_score: analysis.overall_score,
        risk_level: analysis.risk_level,
        model_used: analysis.model_used,
        raw_analysis: analysis.raw_analysis,
      });

      // Update document status to audited
      await documentRepository.updateStatus(document.id, DocumentStatus.AUDITED);

      logger.info(`Audit completed for Document ID ${document.id}. Score: ${report.overall_score}/100, Verdict: ${report.authenticity_verdict}`);
      return report;
    } catch (err) {
      logger.error(`Audit failed for Document ID ${document.id}`, { error: err.message });
      await documentRepository.updateStatus(document.id, DocumentStatus.FAILED);

      // Record failed audit report for audit trail
      const failedReport = await auditRepository.create({
        document_id: document.id,
        organization_id: document.organization_id,
        audited_by: userId,
        status: AuditStatus.FAILED,
        error_message: err.message,
      });

      throw ApiError.internal(`AI Audit failed: ${err.message}`);
    }
  }

  /**
   * Get single audit report by ID
   * @param {number|string} auditId 
   * @param {number|string} userId 
   */
  async getAuditReport(auditId, userId) {
    const report = await auditRepository.findById(auditId);
    if (!report) {
      throw ApiError.notFound('Audit report not found');
    }

    const membership = await organizationRepository.findMember(report.organization_id, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this audit report');
    }

    return report;
  }

  /**
   * Get audit report by document ID
   * @param {number|string} documentId 
   * @param {number|string} userId 
   */
  async getAuditReportByDocumentId(documentId, userId) {
    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    const membership = await organizationRepository.findMember(document.organization_id, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this document audit report');
    }

    const report = await auditRepository.findByDocumentId(documentId);
    if (!report) {
      throw ApiError.notFound('No audit report found for this document');
    }

    return report;
  }

  /**
   * List all audit reports in an organization with pagination and filters
   * @param {number|string} organizationId 
   * @param {number|string} userId 
   * @param {Object} queryOptions 
   */
  async getOrganizationAudits(organizationId, userId, { page = 1, limit = 10, status, verdict, risk_level } = {}) {
    const membership = await organizationRepository.findMember(organizationId, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this organization audits');
    }

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (parsedPage - 1) * parsedLimit;

    const [reports, total] = await Promise.all([
      auditRepository.findByOrganization(organizationId, {
        limit: parsedLimit,
        offset,
        status,
        verdict,
        risk_level,
      }),
      auditRepository.countByOrganization(organizationId, { status, verdict, risk_level }),
    ]);

    return {
      reports,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  /**
   * List all uploaded documents for an organization
   * @param {number|string} organizationId 
   * @param {number|string} userId 
   * @param {Object} queryOptions 
   */
  async getOrganizationDocuments(organizationId, userId, { page = 1, limit = 10, status, file_type } = {}) {
    const membership = await organizationRepository.findMember(organizationId, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this organization documents');
    }

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (parsedPage - 1) * parsedLimit;

    const [documents, total] = await Promise.all([
      documentRepository.findByOrganization(organizationId, {
        limit: parsedLimit,
        offset,
        status,
        file_type,
      }),
      documentRepository.countByOrganization(organizationId, { status, file_type }),
    ]);

    return {
      documents,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  /**
   * Get single document metadata
   * @param {number|string} documentId 
   * @param {number|string} userId 
   */
  async getDocumentById(documentId, userId) {
    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    const membership = await organizationRepository.findMember(document.organization_id, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this document');
    }

    return document;
  }
}

export default new AuditService();

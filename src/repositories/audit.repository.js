import { query } from '../config/db.js';

class AuditRepository {
  /**
   * Save a newly created or completed audit report
   * @param {Object} reportData 
   */
  async create({
    document_id,
    organization_id,
    audited_by,
    status = 'pending',
    summary = null,
    authenticity_verdict = null,
    authenticity_score = null,
    is_fake = false,
    is_spam = false,
    faults = [],
    security_measures = [],
    overall_score = null,
    risk_level = null,
    model_used = null,
    raw_analysis = {},
    error_message = null,
  }) {
    const sql = `
      INSERT INTO audit_reports (
        document_id, organization_id, audited_by, status, summary,
        authenticity_verdict, authenticity_score, is_fake, is_spam,
        faults, security_measures, overall_score, risk_level, model_used,
        raw_analysis, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;
    const res = await query(sql, [
      document_id,
      organization_id,
      audited_by,
      status,
      summary,
      authenticity_verdict,
      authenticity_score,
      is_fake,
      is_spam,
      JSON.stringify(faults),
      JSON.stringify(security_measures),
      overall_score,
      risk_level,
      model_used,
      JSON.stringify(raw_analysis),
      error_message,
    ]);
    return res.rows[0];
  }

  /**
   * Find audit report by ID
   * @param {number|string} id 
   */
  async findById(id) {
    const sql = `
      SELECT ar.*,
             d.original_name AS document_name, d.stored_filename, d.file_path, d.mime_type, d.file_size, d.file_type,
             u.first_name AS auditor_first_name, u.last_name AS auditor_last_name, u.email AS auditor_email,
             o.name AS organization_name, o.slug AS organization_slug
      FROM audit_reports ar
      JOIN documents d ON d.id = ar.document_id
      JOIN organizations o ON o.id = ar.organization_id
      LEFT JOIN users u ON u.id = ar.audited_by
      WHERE ar.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * Find latest audit report for a specific document
   * @param {number|string} documentId 
   */
  async findByDocumentId(documentId) {
    const sql = `
      SELECT ar.*,
             d.original_name AS document_name, d.stored_filename, d.file_type
      FROM audit_reports ar
      JOIN documents d ON d.id = ar.document_id
      WHERE ar.document_id = $1
      ORDER BY ar.created_at DESC
      LIMIT 1;
    `;
    const res = await query(sql, [documentId]);
    return res.rows[0] || null;
  }

  /**
   * Find all audit reports for an organization with pagination & filters
   * @param {number|string} orgId 
   * @param {Object} options 
   */
  async findByOrganization(orgId, { limit = 10, offset = 0, status, verdict, risk_level } = {}) {
    let sql = `
      SELECT ar.id, ar.document_id, ar.organization_id, ar.status, ar.summary,
             ar.authenticity_verdict, ar.authenticity_score, ar.is_fake, ar.is_spam,
             ar.overall_score, ar.risk_level, ar.model_used, ar.created_at,
             d.original_name AS document_name, d.file_type, d.file_size,
             u.first_name AS auditor_first_name, u.last_name AS auditor_last_name
      FROM audit_reports ar
      JOIN documents d ON d.id = ar.document_id
      LEFT JOIN users u ON u.id = ar.audited_by
      WHERE ar.organization_id = $1
    `;
    const params = [orgId];

    if (status) {
      params.push(status);
      sql += ` AND ar.status = $${params.length}`;
    }

    if (verdict) {
      params.push(verdict);
      sql += ` AND ar.authenticity_verdict = $${params.length}`;
    }

    if (risk_level) {
      params.push(risk_level);
      sql += ` AND ar.risk_level = $${params.length}`;
    }

    sql += ` ORDER BY ar.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Count audit reports for an organization
   */
  async countByOrganization(orgId, { status, verdict, risk_level } = {}) {
    let sql = `SELECT COUNT(*) AS total FROM audit_reports WHERE organization_id = $1`;
    const params = [orgId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (verdict) {
      params.push(verdict);
      sql += ` AND authenticity_verdict = $${params.length}`;
    }

    if (risk_level) {
      params.push(risk_level);
      sql += ` AND risk_level = $${params.length}`;
    }

    const res = await query(sql, params);
    return parseInt(res.rows[0].total, 10);
  }

  /**
   * Update existing audit report
   * @param {number|string} id 
   * @param {Object} updateData 
   */
  async update(id, {
    status,
    summary,
    authenticity_verdict,
    authenticity_score,
    is_fake,
    is_spam,
    faults,
    security_measures,
    overall_score,
    risk_level,
    model_used,
    raw_analysis,
    error_message,
  }) {
    const sql = `
      UPDATE audit_reports
      SET status = COALESCE($1, status),
          summary = COALESCE($2, summary),
          authenticity_verdict = COALESCE($3, authenticity_verdict),
          authenticity_score = COALESCE($4, authenticity_score),
          is_fake = COALESCE($5, is_fake),
          is_spam = COALESCE($6, is_spam),
          faults = COALESCE($7, faults),
          security_measures = COALESCE($8, security_measures),
          overall_score = COALESCE($9, overall_score),
          risk_level = COALESCE($10, risk_level),
          model_used = COALESCE($11, model_used),
          raw_analysis = COALESCE($12, raw_analysis),
          error_message = COALESCE($13, error_message),
          updated_at = NOW()
      WHERE id = $14
      RETURNING *;
    `;
    const res = await query(sql, [
      status,
      summary,
      authenticity_verdict,
      authenticity_score,
      is_fake,
      is_spam,
      faults ? JSON.stringify(faults) : null,
      security_measures ? JSON.stringify(security_measures) : null,
      overall_score,
      risk_level,
      model_used,
      raw_analysis ? JSON.stringify(raw_analysis) : null,
      error_message,
      id,
    ]);
    return res.rows[0] || null;
  }
}

export default new AuditRepository();

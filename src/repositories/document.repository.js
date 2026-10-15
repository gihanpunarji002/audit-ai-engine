import { query } from '../config/db.js';

class DocumentRepository {
  /**
   * Insert a newly uploaded document record
   * @param {Object} docData 
   */
  async create({
    organization_id,
    uploaded_by,
    original_name,
    stored_filename,
    file_path,
    file_size,
    mime_type,
    file_type,
    metadata = {},
  }) {
    const sql = `
      INSERT INTO documents (
        organization_id, uploaded_by, original_name, stored_filename,
        file_path, file_size, mime_type, file_type, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, organization_id, uploaded_by, original_name, stored_filename,
                file_path, file_size, mime_type, file_type, status, metadata,
                chroma_collection_id, embedding_status, chunk_count, created_at, updated_at;
    `;
    const res = await query(sql, [
      organization_id,
      uploaded_by,
      original_name,
      stored_filename,
      file_path,
      file_size,
      mime_type,
      file_type,
      JSON.stringify(metadata),
    ]);
    return res.rows[0];
  }

  /**
   * Find document by ID
   * @param {number|string} id 
   */
  async findById(id) {
    const sql = `
      SELECT d.*,
             u.first_name AS uploader_first_name, u.last_name AS uploader_last_name, u.email AS uploader_email,
             o.name AS organization_name, o.slug AS organization_slug
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      JOIN organizations o ON o.id = d.organization_id
      WHERE d.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * Find documents in an organization with pagination and optional filters
   * @param {number|string} orgId 
   * @param {Object} options 
   */
  async findByOrganization(orgId, { limit = 10, offset = 0, status, file_type } = {}) {
    let sql = `
      SELECT d.*,
             u.first_name AS uploader_first_name, u.last_name AS uploader_last_name,
             ar.overall_score, ar.authenticity_verdict, ar.risk_level, ar.id AS audit_report_id
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      LEFT JOIN audit_reports ar ON ar.document_id = d.id
      WHERE d.organization_id = $1
    `;
    const params = [orgId];

    if (status) {
      params.push(status);
      sql += ` AND d.status = $${params.length}`;
    }

    if (file_type) {
      params.push(file_type);
      sql += ` AND d.file_type = $${params.length}`;
    }

    sql += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Count documents for an organization
   */
  async countByOrganization(orgId, { status, file_type } = {}) {
    let sql = `SELECT COUNT(*) AS total FROM documents WHERE organization_id = $1`;
    const params = [orgId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (file_type) {
      params.push(file_type);
      sql += ` AND file_type = $${params.length}`;
    }

    const res = await query(sql, params);
    return parseInt(res.rows[0].total, 10);
  }

  /**
   * Update document processing status
   * @param {number|string} id 
   * @param {string} status 
   */
  async updateStatus(id, status) {
    const sql = `
      UPDATE documents
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, status, updated_at;
    `;
    const res = await query(sql, [status, id]);
    return res.rows[0] || null;
  }

  /**
   * Part 2 RAG Hook: Update embedding and Chroma collection metadata
   * @param {number|string} id 
   * @param {Object} embeddingData 
   */
  async updateEmbeddingStatus(id, { chroma_collection_id, embedding_status, chunk_count }) {
    const sql = `
      UPDATE documents
      SET chroma_collection_id = COALESCE($1, chroma_collection_id),
          embedding_status = COALESCE($2, embedding_status),
          chunk_count = COALESCE($3, chunk_count),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, chroma_collection_id, embedding_status, chunk_count;
    `;
    const res = await query(sql, [chroma_collection_id, embedding_status, chunk_count, id]);
    return res.rows[0] || null;
  }

  /**
   * Delete document by ID
   * @param {number|string} id 
   */
  async delete(id) {
    const sql = `DELETE FROM documents WHERE id = $1 RETURNING id, file_path;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }
}

export default new DocumentRepository();

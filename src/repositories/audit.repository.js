import { db } from '../config/firebase.js';

class AuditRepository {
  constructor() {
    this.collection = db.collection('audit_reports');
  }

  /**
   * Save a newly created or completed audit report in Firestore
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
    const docRef = this.collection.doc();
    const now = new Date().toISOString();

    const data = {
      id: docRef.id,
      document_id: String(document_id),
      organization_id: String(organization_id),
      audited_by: audited_by ? String(audited_by) : null,
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
      created_at: now,
      updated_at: now,
    };

    await docRef.set(data);
    return data;
  }

  /**
   * Find audit report by ID
   * @param {string|number} id 
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(String(id)).get();
    if (!doc.exists) return null;

    const data = { id: doc.id, ...doc.data() };

    // Attach document, org, and auditor details
    const [docSnap, orgSnap, userSnap] = await Promise.all([
      db.collection('documents').doc(data.document_id).get(),
      db.collection('organizations').doc(data.organization_id).get(),
      data.audited_by ? db.collection('users').doc(data.audited_by).get() : Promise.resolve(null),
    ]);

    if (docSnap && docSnap.exists) {
      const d = docSnap.data();
      data.document_name = d.original_name;
      data.stored_filename = d.stored_filename;
      data.file_path = d.file_path;
      data.mime_type = d.mime_type;
      data.file_size = d.file_size;
      data.file_type = d.file_type;
      data.download_url = d.download_url;
    }

    if (orgSnap && orgSnap.exists) {
      data.organization_name = orgSnap.data().name;
      data.organization_slug = orgSnap.data().slug;
    }

    if (userSnap && userSnap.exists) {
      data.auditor_first_name = userSnap.data().first_name;
      data.auditor_last_name = userSnap.data().last_name;
      data.auditor_email = userSnap.data().email;
    }

    return data;
  }

  /**
   * Find latest audit report for a specific document
   * @param {string|number} documentId 
   */
  async findByDocumentId(documentId) {
    if (!documentId) return null;
    const snapshot = await this.collection
      .where('document_id', '==', String(documentId))
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  /**
   * Find all audit reports for an organization with pagination & filters
   * @param {string|number} orgId 
   * @param {Object} options 
   */
  async findByOrganization(orgId, { limit = 10, offset = 0, status, verdict, risk_level } = {}) {
    let query = this.collection
      .where('organization_id', '==', String(orgId))
      .orderBy('created_at', 'desc');

    if (status) query = query.where('status', '==', status);
    if (verdict) query = query.where('authenticity_verdict', '==', verdict);
    if (risk_level) query = query.where('risk_level', '==', risk_level);

    if (offset > 0) {
      query = query.offset(offset);
    }
    query = query.limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Count audit reports for an organization
   */
  async countByOrganization(orgId, { status, verdict, risk_level } = {}) {
    let query = this.collection.where('organization_id', '==', String(orgId));

    if (status) query = query.where('status', '==', status);
    if (verdict) query = query.where('authenticity_verdict', '==', verdict);
    if (risk_level) query = query.where('risk_level', '==', risk_level);

    const countSnap = await query.count().get();
    return countSnap.data().count || 0;
  }

  /**
   * Update existing audit report
   * @param {string|number} id 
   * @param {Object} updateData 
   */
  async update(id, updateData) {
    const docRef = this.collection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const updates = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    await docRef.update(updates);
    return { id, ...doc.data(), ...updates };
  }
}

export default new AuditRepository();

import { db } from '../config/firebase.js';

class DocumentRepository {
  constructor() {
    this.collection = db.collection('documents');
  }

  /**
   * Insert a newly uploaded document record in Firestore
   * @param {Object} docData 
   */
  async create({
    organization_id,
    uploaded_by,
    original_name,
    stored_filename,
    file_path,
    storage_path = null,
    download_url = null,
    file_size,
    mime_type,
    file_type,
    metadata = {},
  }) {
    const docRef = this.collection.doc();
    const now = new Date().toISOString();

    const data = {
      id: docRef.id,
      organization_id: String(organization_id),
      uploaded_by: String(uploaded_by),
      original_name,
      stored_filename,
      file_path,
      storage_path,
      download_url,
      file_size,
      mime_type,
      file_type,
      status: 'uploaded',
      metadata,
      embedding_status: 'pending',
      chunk_count: 0,
      created_at: now,
      updated_at: now,
    };

    await docRef.set(data);
    return data;
  }

  /**
   * Find document by ID with uploader and org info
   * @param {string|number} id 
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(String(id)).get();
    if (!doc.exists) return null;

    const data = { id: doc.id, ...doc.data() };

    // Attach uploader and org names
    const [userDoc, orgDoc] = await Promise.all([
      db.collection('users').doc(data.uploaded_by).get(),
      db.collection('organizations').doc(data.organization_id).get(),
    ]);

    if (userDoc.exists) {
      data.uploader_first_name = userDoc.data().first_name;
      data.uploader_last_name = userDoc.data().last_name;
      data.uploader_email = userDoc.data().email;
    }

    if (orgDoc.exists) {
      data.organization_name = orgDoc.data().name;
      data.organization_slug = orgDoc.data().slug;
    }

    return data;
  }

  /**
   * Find documents in an organization with pagination and filters
   * @param {string|number} orgId 
   * @param {Object} options 
   */
  async findByOrganization(orgId, { limit = 10, offset = 0, status, file_type } = {}) {
    let query = this.collection
      .where('organization_id', '==', String(orgId))
      .orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (file_type) {
      query = query.where('file_type', '==', file_type);
    }

    if (offset > 0) {
      query = query.offset(offset);
    }

    query = query.limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Count documents for an organization
   */
  async countByOrganization(orgId, { status, file_type } = {}) {
    let query = this.collection.where('organization_id', '==', String(orgId));

    if (status) {
      query = query.where('status', '==', status);
    }

    if (file_type) {
      query = query.where('file_type', '==', file_type);
    }

    const countSnap = await query.count().get();
    return countSnap.data().count || 0;
  }

  /**
   * Update document status
   * @param {string|number} id 
   * @param {string} status 
   */
  async updateStatus(id, status) {
    const docRef = this.collection.doc(String(id));
    await docRef.update({
      status,
      updated_at: new Date().toISOString(),
    });
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  /**
   * Update embedding and chunk count
   * @param {string|number} id 
   * @param {Object} embeddingData 
   */
  async updateEmbeddingStatus(id, { embedding_status, chunk_count, vector_collection }) {
    const docRef = this.collection.doc(String(id));
    const updates = {
      embedding_status,
      chunk_count,
      updated_at: new Date().toISOString(),
    };
    if (vector_collection) {
      updates.chroma_collection_id = vector_collection;
    }

    await docRef.update(updates);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  /**
   * Delete document by ID
   * @param {string|number} id 
   */
  async delete(id) {
    const docRef = this.collection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;
    const data = { id: doc.id, ...doc.data() };
    await docRef.delete();
    return data;
  }
}

export default new DocumentRepository();

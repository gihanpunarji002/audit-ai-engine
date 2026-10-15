import { db } from '../config/firebase.js';
import { OrganizationRole } from '../constants/roles.js';

class OrganizationRepository {
  constructor() {
    this.orgsCollection = db.collection('organizations');
    this.membersCollection = db.collection('organization_members');
    this.invitesCollection = db.collection('organization_invitations');
  }

  /**
   * Create an organization and automatically attach creator as OWNER
   * @param {Object} orgData 
   */
  async createWithInitialOwner({ name, slug, description, owner_id }) {
    const orgDocRef = this.orgsCollection.doc();
    const now = new Date().toISOString();

    const orgData = {
      id: orgDocRef.id,
      name,
      slug,
      description: description || null,
      owner_id: String(owner_id),
      created_at: now,
      updated_at: now,
    };

    const memberDocRef = this.membersCollection.doc(`${orgDocRef.id}_${owner_id}`);
    const memberData = {
      id: memberDocRef.id,
      organization_id: orgDocRef.id,
      user_id: String(owner_id),
      role: OrganizationRole.OWNER,
      joined_at: now,
      updated_at: now,
    };

    const batch = db.batch();
    batch.set(orgDocRef, orgData);
    batch.set(memberDocRef, memberData);
    await batch.commit();

    return orgData;
  }

  /**
   * Find organization by ID
   * @param {string|number} id 
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.orgsCollection.doc(String(id)).get();
    if (!doc.exists) return null;

    const orgData = { id: doc.id, ...doc.data() };

    // Fetch owner details
    if (orgData.owner_id) {
      const ownerDoc = await db.collection('users').doc(String(orgData.owner_id)).get();
      if (ownerDoc.exists) {
        const owner = ownerDoc.data();
        orgData.owner_first_name = owner.first_name;
        orgData.owner_last_name = owner.last_name;
        orgData.owner_email = owner.email;
      }
    }

    return orgData;
  }

  /**
   * Find organization by unique slug
   * @param {string} slug 
   */
  async findBySlug(slug) {
    if (!slug) return null;
    const snapshot = await this.orgsCollection.where('slug', '==', slug).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  /**
   * Get all organizations a user belongs to with their role
   * @param {string|number} userId 
   */
  async findUserOrganizations(userId) {
    const memberSnapshot = await this.membersCollection
      .where('user_id', '==', String(userId))
      .get();

    if (memberSnapshot.empty) return [];

    const results = [];
    for (const memberDoc of memberSnapshot.docs) {
      const member = memberDoc.data();
      const orgDoc = await this.orgsCollection.doc(member.organization_id).get();
      if (orgDoc.exists) {
        const org = orgDoc.data();
        // Count members
        const countSnap = await this.membersCollection
          .where('organization_id', '==', member.organization_id)
          .count()
          .get();

        results.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          owner_id: org.owner_id,
          member_role: member.role,
          joined_at: member.joined_at,
          created_at: org.created_at,
          member_count: countSnap.data().count || 1,
        });
      }
    }

    return results;
  }

  /**
   * Get membership details for a specific user in an organization
   * @param {string|number} orgId 
   * @param {string|number} userId 
   */
  async findMember(orgId, userId) {
    if (!orgId || !userId) return null;
    const doc = await this.membersCollection.doc(`${orgId}_${userId}`).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  /**
   * List all members of an organization with user profiles
   * @param {string|number} orgId 
   */
  async findMembers(orgId) {
    const snapshot = await this.membersCollection
      .where('organization_id', '==', String(orgId))
      .get();

    if (snapshot.empty) return [];

    const members = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userDoc = await db.collection('users').doc(String(data.user_id)).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      members.push({
        id: doc.id,
        organization_id: data.organization_id,
        user_id: data.user_id,
        role: data.role,
        joined_at: data.joined_at,
        email: userData.email || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        avatar_url: userData.avatar_url || null,
      });
    }

    return members;
  }

  /**
   * Add a member to an organization
   * @param {Object} memberData 
   */
  async addMember({ organization_id, user_id, role = 'member' }) {
    const docRef = this.membersCollection.doc(`${organization_id}_${user_id}`);
    const now = new Date().toISOString();

    const data = {
      id: docRef.id,
      organization_id: String(organization_id),
      user_id: String(user_id),
      role,
      joined_at: now,
      updated_at: now,
    };

    await docRef.set(data);
    return data;
  }

  /**
   * Update member role in organization
   * @param {string|number} orgId 
   * @param {string|number} userId 
   * @param {string} role 
   */
  async updateMemberRole(orgId, userId, role) {
    const docRef = this.membersCollection.doc(`${orgId}_${userId}`);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const updates = {
      role,
      updated_at: new Date().toISOString(),
    };

    await docRef.update(updates);
    return { id: docRef.id, ...doc.data(), ...updates };
  }

  /**
   * Remove member from organization
   * @param {string|number} orgId 
   * @param {string|number} userId 
   */
  async removeMember(orgId, userId) {
    const docRef = this.membersCollection.doc(`${orgId}_${userId}`);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
  }

  /**
   * Create member invitation
   * @param {Object} inviteData 
   */
  async createInvitation({ organization_id, email, role, token, expires_at, invited_by }) {
    const docRef = this.invitesCollection.doc();
    const data = {
      id: docRef.id,
      organization_id: String(organization_id),
      email: email.trim().toLowerCase(),
      role,
      token,
      status: 'pending',
      expires_at: expires_at instanceof Date ? expires_at.toISOString() : expires_at,
      invited_by: String(invited_by),
      created_at: new Date().toISOString(),
    };

    await docRef.set(data);
    return data;
  }

  /**
   * Find invitation by token
   * @param {string} token 
   */
  async findInvitationByToken(token) {
    const snapshot = await this.invitesCollection.where('token', '==', token).limit(1).get();
    if (snapshot.empty) return null;

    const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

    // Fetch organization and inviter info
    const [orgDoc, inviterDoc] = await Promise.all([
      this.orgsCollection.doc(data.organization_id).get(),
      db.collection('users').doc(data.invited_by).get(),
    ]);

    if (orgDoc.exists) {
      data.organization_name = orgDoc.data().name;
      data.organization_slug = orgDoc.data().slug;
    }

    if (inviterDoc.exists) {
      data.inviter_first_name = inviterDoc.data().first_name;
      data.inviter_last_name = inviterDoc.data().last_name;
    }

    return data;
  }

  /**
   * Update invitation status
   * @param {string|number} id 
   * @param {string} status 
   */
  async updateInvitationStatus(id, status) {
    const docRef = this.invitesCollection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;

    await docRef.update({
      status,
      updated_at: new Date().toISOString(),
    });

    return { id, status };
  }

  /**
   * List pending invitations for an organization
   * @param {string|number} orgId 
   */
  async findPendingInvitations(orgId) {
    const now = new Date().toISOString();
    const snapshot = await this.invitesCollection
      .where('organization_id', '==', String(orgId))
      .where('status', '==', 'pending')
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((inv) => inv.expires_at > now);
  }
}

export default new OrganizationRepository();

import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { db } from '../config/firebase.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { SystemRole, OrganizationRole } from '../constants/roles.js';

export const seedFirestore = async () => {
  logger.info('Starting Cloud Firestore database seeding...');

  try {
    const saltRounds = config.bcrypt.saltRounds;
    const adminPasswordHash = await bcrypt.hash('Admin@123456', saltRounds);
    const now = new Date().toISOString();

    // 1. Seed default superadmin / auditor
    const usersCol = db.collection('users');
    const existingAdminSnap = await usersCol.where('email', '==', 'admin@auditengine.ai').limit(1).get();

    let adminId;
    if (existingAdminSnap.empty) {
      const adminRef = usersCol.doc();
      adminId = adminRef.id;
      await adminRef.set({
        id: adminId,
        email: 'admin@auditengine.ai',
        password_hash: adminPasswordHash,
        first_name: 'System',
        last_name: 'Administrator',
        role: SystemRole.SUPERADMIN,
        is_active: true,
        avatar_url: null,
        created_at: now,
        updated_at: now,
      });
      logger.info(`Seeded Superadmin user in Firestore: admin@auditengine.ai (ID: ${adminId})`);
    } else {
      adminId = existingAdminSnap.docs[0].id;
      logger.info(`Superadmin user already exists: admin@auditengine.ai (ID: ${adminId})`);
    }

    // 2. Seed default organization
    const orgsCol = db.collection('organizations');
    const existingOrgSnap = await orgsCol.where('slug', '==', 'global-audit-corp').limit(1).get();

    let orgId;
    if (existingOrgSnap.empty) {
      const orgRef = orgsCol.doc();
      orgId = orgRef.id;
      await orgRef.set({
        id: orgId,
        name: 'Global Audit & Compliance Corp',
        slug: 'global-audit-corp',
        description: 'Enterprise security and compliance auditing workspace',
        owner_id: adminId,
        created_at: now,
        updated_at: now,
      });
      logger.info(`Seeded Organization: Global Audit & Compliance Corp (ID: ${orgId})`);
    } else {
      orgId = existingOrgSnap.docs[0].id;
      logger.info(`Organization already exists: global-audit-corp (ID: ${orgId})`);
    }

    // 3. Ensure owner membership
    const membersCol = db.collection('organization_members');
    const memberDocRef = membersCol.doc(`${orgId}_${adminId}`);
    await memberDocRef.set(
      {
        id: memberDocRef.id,
        organization_id: orgId,
        user_id: adminId,
        role: OrganizationRole.OWNER,
        joined_at: now,
        updated_at: now,
      },
      { merge: true }
    );
    logger.info(`Attached Admin as Organization Owner in Firestore`);

    logger.info('Cloud Firestore seeding completed successfully!');
  } catch (error) {
    logger.error('Firestore seeding failed', { error: error.message });
    throw error;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedFirestore()
    .then(() => {
      logger.info('Seeding finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seeding exited with error:', { message: err.message });
      process.exit(1);
    });
}

export default seedFirestore;

import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { query, pool } from '../config/db.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { SystemRole, OrganizationRole } from '../constants/roles.js';

export const seedDatabase = async () => {
  logger.info('Starting database seeding...');

  try {
    const saltRounds = config.bcrypt.saltRounds;
    const adminPasswordHash = await bcrypt.hash('Admin@123456', saltRounds);

    // 1. Seed default superadmin / auditor
    const userSql = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role
      RETURNING id, email, first_name, last_name, role;
    `;

    const userRes = await query(userSql, [
      'admin@auditengine.ai',
      adminPasswordHash,
      'System',
      'Administrator',
      SystemRole.SUPERADMIN,
    ]);

    const adminUser = userRes.rows[0];
    logger.info(`Seeded Superadmin user: ${adminUser.email} (ID: ${adminUser.id})`);

    // 2. Seed default organization
    const orgSql = `
      INSERT INTO organizations (name, slug, description, owner_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description
      RETURNING id, name, slug;
    `;

    const orgRes = await query(orgSql, [
      'Global Audit & Compliance Corp',
      'global-audit-corp',
      'Enterprise security and compliance auditing workspace',
      adminUser.id,
    ]);

    const defaultOrg = orgRes.rows[0];
    logger.info(`Seeded Organization: ${defaultOrg.name} (Slug: ${defaultOrg.slug})`);

    // 3. Ensure owner membership
    const memberSql = `
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
    `;

    await query(memberSql, [defaultOrg.id, adminUser.id, OrganizationRole.OWNER]);
    logger.info(`Attached Admin as Organization Owner`);

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Database seeding failed', { error: error.message });
    throw error;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seeding exited with error:', { message: err.message });
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

export default seedDatabase;

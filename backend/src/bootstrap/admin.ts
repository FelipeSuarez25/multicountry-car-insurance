import type { Core } from '@strapi/strapi';

/**
 * ADR-0002 / US-01-T-32.
 *
 * - Creates a development super admin from STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD when no admin
 *   user exists (the same account the AC-03 end-to-end test and the human use).
 * - Deletes Strapi's default "Full Access" API token: an unused write credential. No token is ever
 *   copied into a `.env`.
 */
export async function ensureDevAdmin(strapi: Core.Strapi): Promise<void> {
  const email = process.env['STRAPI_ADMIN_EMAIL'];
  const password = process.env['STRAPI_ADMIN_PASSWORD'];
  const users = strapi.service('admin::user');
  if (await users.exists()) return;
  if (!email || !password) {
    strapi.log.warn('No admin user exists and STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD are not set: create one at /admin.');
    return;
  }
  await users.createFirstAdmin({ email, firstname: 'Admin', lastname: 'Desarrollo', password });
  strapi.log.info('Created the development super admin from STRAPI_ADMIN_EMAIL.');
}

export async function deleteDefaultFullAccessToken(strapi: Core.Strapi): Promise<void> {
  await strapi.db.query('admin::api-token').deleteMany({ where: { name: 'Full Access', type: 'full-access' } });
}

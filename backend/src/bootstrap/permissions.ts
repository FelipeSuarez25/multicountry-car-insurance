import type { Core } from '@strapi/strapi';

/**
 * ADR-0002 / US-01-T-18: the public role is reconciled to exactly the permissions below on every
 * start. Nothing is configured by hand in the admin panel.
 *
 * US-02 adds `api::plan.plan.find` and US-03 `api::terms.terms.find`, each through its own spec.
 */
export const PUBLIC_PERMISSIONS = ['api::country.country.find', 'api::form-field.form-field.find'];

const PERMISSION = 'plugin::users-permissions.permission';
const ROLE = 'plugin::users-permissions.role';

export async function reconcileRolePermissions(strapi: Core.Strapi): Promise<void> {
  const publicRole = await strapi.db.query(ROLE).findOne({ where: { type: 'public' } });
  if (!publicRole) throw new Error('The users-permissions public role does not exist');

  const current = await strapi.db.query(PERMISSION).findMany({ where: { role: publicRole.id } });
  const wanted = new Set(PUBLIC_PERMISSIONS);

  for (const permission of current) {
    if (!wanted.has(permission.action)) await strapi.db.query(PERMISSION).delete({ where: { id: permission.id } });
  }
  const present = new Set(current.map((permission) => permission.action));
  for (const action of PUBLIC_PERMISSIONS) {
    if (!present.has(action)) await strapi.db.query(PERMISSION).create({ data: { action, role: publicRole.id } });
  }

  // The authenticated role gets no content permission (the app has no end-user accounts).
  const authenticatedRole = await strapi.db.query(ROLE).findOne({ where: { type: 'authenticated' } });
  if (authenticatedRole) {
    await strapi.db.query(PERMISSION).deleteMany({
      where: { role: authenticatedRole.id, action: { $startsWith: 'api::' } },
    });
  }

  // Self-registration is closed (the plugin creates it open on a fresh database).
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = ((await store.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>;
  if (advanced['allow_register'] !== false) await store.set({ key: 'advanced', value: { ...advanced, allow_register: false } });
}

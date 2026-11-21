import type { Core } from '@strapi/strapi';
import { deleteDefaultFullAccessToken, ensureDevAdmin } from './bootstrap/admin';
import { reconcileRolePermissions } from './bootstrap/permissions';
import { registerUniqueFieldKey } from './documents/unique-field-key';
import { registerPlanCoverages } from './documents/plan-coverages';
import { seed } from './seed';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerUniqueFieldKey(strapi);
    registerPlanCoverages(strapi);
  },

  /** Idempotent: runs on every start (ADR-0001, ADR-0002). */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await reconcileRolePermissions(strapi);
    await ensureDevAdmin(strapi);
    await deleteDefaultFullAccessToken(strapi);
    await seed(strapi);
  },
};

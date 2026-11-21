import type { Core } from '@strapi/strapi';
import { registerUniqueFieldKey } from './documents/unique-field-key';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerUniqueFieldKey(strapi);
  },

  bootstrap() {},
};

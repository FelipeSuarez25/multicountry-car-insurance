import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      // ADR-0002: the browser reaches the content API same-origin through nginx, so the allow-list
      // is empty unless CORS_ORIGINS (comma-separated origins) says otherwise.
      origin: env.array('CORS_ORIGINS', []).filter((origin) => origin !== ''),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  // After the query parser, before the routers: removes draft-reading parameters from anonymous requests.
  'global::published-only',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;

import { factories } from '@strapi/strapi';
import { publishedOnlyConfig } from '../../../utils/published-only-config';

export default factories.createCoreRouter('api::term.term', publishedOnlyConfig());

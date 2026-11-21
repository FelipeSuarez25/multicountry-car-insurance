import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/', 'build/', '.cache/', '.tmp/', '.strapi/', 'public/', 'types/', 'tests/', 'src/admin/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

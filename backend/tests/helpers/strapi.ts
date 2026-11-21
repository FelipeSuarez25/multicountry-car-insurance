/**
 * Boots a real Strapi instance for tests, against a throwaway SQLite file, without opening an HTTP
 * port. Tests talk to the Document Service, which is where the ADR-0001 rules live (the
 * `strictRelations` flag and the Document Service middleware for key uniqueness).
 *
 * Run from the `backend/` folder (`npm test`): Strapi resolves the application from the working
 * directory. The first boot compiles the TypeScript sources and takes a while.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Strapi is CommonJS and breaks under Vite's module interop (named imports of lodash fail), so it is
// loaded with Node's own require, resolved from the backend folder.
const nodeRequire = createRequire(path.join(process.cwd(), 'package.json'));
const { compileStrapi, createStrapi } = nodeRequire('@strapi/strapi') as {
  compileStrapi(): Promise<unknown>;
  createStrapi(context: unknown): { load(): Promise<unknown> };
};

/** The small slice of the Document Service the tests use. Strings keep the tests independent of generated types. */
export interface DocumentService {
  create(params: { data: Record<string, unknown>; status?: 'draft' | 'published' }): Promise<{ documentId: string }>;
  update(params: { documentId: string; data: Record<string, unknown>; status?: 'draft' | 'published' }): Promise<{ documentId: string }>;
  publish(params: { documentId: string }): Promise<unknown>;
  delete(params: { documentId: string }): Promise<unknown>;
  findFirst(params?: { filters?: Record<string, unknown>; status?: 'draft' | 'published' }): Promise<{ documentId: string } | null>;
}

export interface TestStrapi {
  documents(uid: string): DocumentService;
  config: { get(path: string, defaultValue?: unknown): unknown };
  contentTypes: Record<string, unknown>;
  destroy(): Promise<void>;
}

const TEST_SECRETS: Record<string, string> = {
  // Fictitious values for a throwaway instance. They protect nothing.
  APP_KEYS: 'testKeyOne==,testKeyTwo==,testKeyThree==,testKeyFour==',
  ADMIN_JWT_SECRET: 'test-admin-jwt-secret', // scan-secrets: allow (fictitious test-only secret for a throwaway instance)
  API_TOKEN_SALT: 'test-api-token-salt', // scan-secrets: allow (fictitious test-only secret for a throwaway instance)
  TRANSFER_TOKEN_SALT: 'test-transfer-token-salt', // scan-secrets: allow (fictitious test-only secret for a throwaway instance)
  ENCRYPTION_KEY: 'test-encryption-key', // scan-secrets: allow (fictitious test-only secret for a throwaway instance)
  JWT_SECRET: 'test-jwt-secret',
};

export async function bootStrapi(): Promise<{ strapi: TestStrapi; dispose(): Promise<void> }> {
  const databaseFile = path.join('.tmp', `us-01-test-${process.pid}-${Date.now()}.db`);
  fs.mkdirSync('.tmp', { recursive: true });

  for (const [name, value] of Object.entries(TEST_SECRETS)) process.env[name] ??= value;
  process.env['DATABASE_CLIENT'] = 'sqlite';
  process.env['DATABASE_FILENAME'] = databaseFile;
  process.env['STRAPI_TELEMETRY_DISABLED'] = 'true';
  process.env['HOST'] = '127.0.0.1';
  process.env['PORT'] = '0';

  const context = await compileStrapi();
  const app = (await createStrapi(context).load()) as unknown as TestStrapi;

  return {
    strapi: app,
    async dispose() {
      // Strapi's shutdown calls process.removeAllListeners(), which would also remove the listeners
      // the test runner's worker uses to talk to Vitest. Put them back afterwards.
      const saved = process.eventNames().map((name) => [name, [...process.listeners(name as NodeJS.Signals)]] as const);
      try {
        await app.destroy();
      } finally {
        process.removeAllListeners();
        for (const [name, listeners] of saved) {
          for (const listener of listeners) process.on(name as NodeJS.Signals, listener as NodeJS.SignalsListener);
        }
      }
      for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(`${databaseFile}${suffix}`, { force: true });
    },
  };
}

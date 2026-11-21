#!/usr/bin/env node
// Project-wide PreToolUse hook for Bash (main session and every subagent).
// Blocks commands that would expose secrets or bypass human checkpoints.
// Blocks by exiting with code 2 and writing the reason to stderr.
//
// This is a guard rail, not a sandbox: it pattern-matches command text, so it catches mistakes,
// not determined circumvention. The human checkpoints remain the real control.

import { readFileSync } from 'node:fs';

function block(reason) {
  process.stderr.write(`[guard-bash] ${reason}\n`);
  process.exit(2);
}

let command = '';
try {
  command = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? '';
} catch {
  block('could not parse hook input; refusing to run the command (fail closed).');
}

// A .env file reference that is not .env.example (e.g. ".env", "backend/.env", ".env.local").
const envFile = /(^|[\s'"=/<>|;&(])\.env(?!\.example\b)(\.[\w-]+)?(?=$|[\s'";|&)<>])/;

const rules = [
  {
    test: (c) => envFile.test(c),
    reason: 'Commands that reference .env files are blocked (secrets must never be printed). ' +
      'Use .env.example for documentation; ask the human if a real .env change is needed.',
  },
  {
    test: (c) => /(^|[\s;&|(])(printenv|env)\s*($|[|;&>])/.test(c) || /\bset\s*\|/.test(c),
    reason: 'Dumping the whole environment is blocked (it may print secrets).',
  },
  {
    test: (c) => /\bgit\s+push\b.*(\s--force(-with-lease)?\b|\s-f\b|\s\+\S)/.test(c),
    reason: 'Force push is blocked.',
  },
  {
    test: (c) => /\bgit\s+push\b[^;&|]*\s(origin\s+)?(HEAD:)?(refs\/heads\/)?main\b/.test(c),
    reason: 'Pushing to main is blocked: changes reach main only through a PR merged by a human (HC3).',
  },
  {
    test: (c) => /\bgh\s+pr\s+(merge|review\s+[^\n]*--approve)\b/.test(c),
    reason: 'Merging or approving PRs is a human checkpoint (HC3); agents may not do it.',
  },
  {
    test: (c) => /--no-verify\b/.test(c),
    reason: '--no-verify is blocked: hooks and checks must not be skipped.',
  },
  {
    test: (c) => /\bgit\s+config\b[^;&|]*--global\b/.test(c),
    reason: 'Changing global git config is blocked; this repo uses local identity only.',
  },
  {
    test: (c) => /\bnpx\s+(-y\s+)?@angular\/cli@latest\b/.test(c) || /\bnpx\s+(-y\s+)?@angular\/cli(\s+)mcp\b/.test(c),
    reason: 'Angular CLI must be pinned (CLAUDE.md §4) and the Angular CLI MCP server is not used (§5).',
  },
];

for (const rule of rules) {
  if (rule.test(command)) block(rule.reason);
}
process.exit(0);

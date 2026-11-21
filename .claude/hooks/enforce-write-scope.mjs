#!/usr/bin/env node
// PreToolUse hook used in subagent frontmatter (matcher: Write|Edit|NotebookEdit).
// Allows a write only if the target path, relative to the project root, matches at least one
// --allow glob and no --deny glob. Paths outside the project are always denied.
//
// Usage: enforce-write-scope.mjs --allow 'specs/**' --allow 'adr/**' --deny '**/*.spec.ts'
// Globs: '**' = any depth, '*' = any chars except '/', '?' = one char, '[0-9]' = class.
// Matching is against POSIX paths relative to the project root.
//
// Blocks by exiting with code 2 and writing the reason to stderr (Claude Code hook contract).

import { readFileSync } from 'node:fs';
import path from 'node:path';

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      // '**/' matches zero or more directories; a trailing '**' matches everything below.
      if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '[') {
      // Character class such as [0-9]; copied through (a leading '!' negates, as in shell globs).
      const end = glob.indexOf(']', i + 1);
      if (end === -1) throw new Error(`unclosed '[' in glob ${glob}`);
      let cls = glob.slice(i + 1, end).replace(/\\/g, '\\\\');
      if (cls.startsWith('!')) cls = `^${cls.slice(1)}`;
      re += `[${cls}]`;
      i = end;
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function parseArgs(argv) {
  const allow = [];
  const deny = [];
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (!value) throw new Error(`missing value for ${flag}`);
    if (flag === '--allow') allow.push(value);
    else if (flag === '--deny') deny.push(value);
    else throw new Error(`unknown flag ${flag}`);
  }
  return { allow, deny };
}

function block(reason) {
  process.stderr.write(`[write-scope] ${reason}\n`);
  process.exit(2);
}

let input;
let rules;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
  rules = parseArgs(process.argv.slice(2));
} catch (err) {
  // Fail closed: a broken hook must not silently allow writes.
  block(`hook misconfigured: ${err.message}`);
}

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
const filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
if (!filePath) block('no file_path in tool input');

const absolute = path.resolve(input.cwd || projectDir, filePath);
const relative = path.relative(projectDir, absolute).split(path.sep).join('/');

if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
  block(`"${filePath}" is outside the project; this agent may not write there.`);
}

const matches = (globs) => globs.some((g) => globToRegExp(g).test(relative));

if (matches(rules.deny)) {
  block(`"${relative}" is explicitly outside this agent's write scope (deny: ${rules.deny.join(', ')}).`);
}
if (!matches(rules.allow)) {
  block(`"${relative}" is outside this agent's write scope (allowed: ${rules.allow.join(', ')}). ` +
    'If the change is needed, report it to the orchestrator instead of writing it.');
}
process.exit(0);

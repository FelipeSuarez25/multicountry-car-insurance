import type { RichTextBlock, RichTextList, RichTextListItem, RichTextSpan } from './rich-text-blocks.model';

/**
 * Boundary parser of Strapi `blocks` (ADR-0009). Pure: no Angular. The value is `unknown` until
 * checked; only the whitelisted tree comes out. Unsupported formatting degrades or is dropped with
 * a `console.warn` that names the node type or the problem, never text, a URL or a file name.
 */

const MAX_LIST_DEPTH = 6;
const SHORT_IDENTIFIER = /^[a-z-]{1,32}$/;

type Wire = Record<string, unknown>;
const isRec = (v: unknown): v is Wire => typeof v === 'object' && v !== null && !Array.isArray(v);
const isBlank = (spans: readonly RichTextSpan[]): boolean => spans.every((s) => s.text.trim() === '');

/** The node type for a warning: a short identifier as is, anything else "unknown" (it may be markup). */
function typeName(node: unknown): string {
  const type = isRec(node) ? node['type'] : undefined;
  return typeof type === 'string' && SHORT_IDENTIFIER.test(type) ? type : 'unknown';
}

function warn(what: string): void {
  console.warn(`rich text: ${what}`);
}

/** The spans of the inline children of a block; links keep their text only. */
function parseInline(children: unknown[], insideLink = false): RichTextSpan[] {
  const spans: RichTextSpan[] = [];
  for (const child of children) {
    if (isRec(child) && child['type'] === 'text') {
      if (typeof child['text'] !== 'string') {
        warn('text');
        continue;
      }
      spans.push({
        text: child['text'],
        bold: child['bold'] === true,
        italic: child['italic'] === true,
        underline: child['underline'] === true,
        strikethrough: child['strikethrough'] === true,
      });
    } else if (isRec(child) && child['type'] === 'link') {
      if (insideLink) {
        // A link inside a link is not a supported shape: dropped, so recursion stops at one level.
        warn('link-depth');
        continue;
      }
      warn('link');
      if (Array.isArray(child['children'])) {
        for (const inner of parseInline(child['children'], true)) spans.push(inner);
      }
    } else {
      warn(typeName(child));
    }
  }
  return spans;
}

function parseList(node: Wire, depth: number): RichTextList | null {
  const format = node['format'];
  if ((format !== 'ordered' && format !== 'unordered') || !Array.isArray(node['children'])) {
    warn('list');
    return null;
  }
  const items: RichTextListItem[] = [];
  // The item a following nested list attaches to; null when none, or the item was dropped.
  let last: RichTextListItem | null = null;
  for (const child of node['children']) {
    if (isRec(child) && child['type'] === 'list') {
      if (depth >= MAX_LIST_DEPTH) {
        warn('list-depth');
        continue;
      }
      const nested = parseList(child, depth + 1);
      if (!nested) continue;
      if (!last) {
        last = { spans: [], lists: [] };
        items.push(last);
      }
      last.lists.push(nested);
    } else if (isRec(child) && child['type'] === 'list-item' && Array.isArray(child['children'])) {
      const spans = parseInline(child['children']);
      if (isBlank(spans)) {
        last = null;
        continue;
      }
      last = { spans, lists: [] };
      items.push(last);
    } else {
      warn(typeName(child));
    }
  }
  return items.length > 0 ? { ordered: format === 'ordered', items } : null;
}

interface RawHeading {
  level: number;
  spans: RichTextSpan[];
}

/** `null` when the whole body is malformed: not an array, or no text left after the rules. */
export function parseRichTextBlocks(value: unknown): RichTextBlock[] | null {
  if (!Array.isArray(value)) {
    warn('body');
    return null;
  }
  // Headings are collected with their level; depth is relative to the smallest level kept.
  const pending: (RichTextBlock | RawHeading)[] = [];
  for (const node of value) {
    if (!isRec(node)) {
      warn(typeName(node));
      continue;
    }
    const type = node['type'];
    const children = node['children'];
    if (type === 'list') {
      const list = parseList(node, 1);
      if (list) pending.push({ kind: 'list', list });
    } else if (type === 'paragraph' || type === 'quote' || type === 'code' || type === 'heading') {
      if (!Array.isArray(children)) {
        warn(typeName(node));
        continue;
      }
      const level = node['level'];
      if (type === 'heading' && !(typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 6)) {
        warn('heading');
        continue;
      }
      if (type === 'quote' || type === 'code') warn(type);
      const spans = parseInline(children);
      if (isBlank(spans)) continue;
      pending.push(type === 'heading' ? { level: level as number, spans } : { kind: 'paragraph', spans });
    } else {
      warn(typeName(node));
    }
  }
  let smallest = Infinity;
  for (const b of pending) if ('level' in b && b.level < smallest) smallest = b.level;
  if (smallest === Infinity) smallest = 1;
  const blocks: RichTextBlock[] = pending.map((b) => ('level' in b ? { kind: 'heading', depth: b.level - smallest, spans: b.spans } : b));
  if (blocks.length === 0) {
    warn('body');
    return null;
  }
  return blocks;
}

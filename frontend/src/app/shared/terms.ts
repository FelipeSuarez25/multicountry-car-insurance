import { parseRichTextBlocks } from './rich-text-blocks';
import type { Terms } from './terms.model';

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

interface Candidate {
  terms: Terms;
  publishedAt: number;
}

function parseItem(raw: unknown): Candidate | null {
  if (!isRec(raw)) {
    console.warn('terms: an entry was skipped (item)');
    return null;
  }
  const title = raw['title'];
  if (typeof title !== 'string' || title.trim() === '') {
    console.warn('terms: an entry was skipped (title)');
    return null;
  }
  const published = raw['publishedAt'];
  const instant = typeof published === 'string' ? Date.parse(published) : NaN;
  if (Number.isNaN(instant)) {
    console.warn('terms: an entry was skipped (publishedAt)');
    return null;
  }
  const blocks = parseRichTextBlocks(raw['body']);
  if (blocks === null) {
    console.warn('terms: an entry was skipped (body)');
    return null;
  }
  return { terms: { title, blocks }, publishedAt: instant };
}

/**
 * Boundary validation and selection of the terms response (spec 7.2): the most recently published
 * well-formed entry (the server sort is not trusted), or `null` when there is none. Warnings name
 * the problem, never the text. Throws when the body is not a list at all (the page then shows its
 * error state).
 */
export function parseTerms(body: unknown): Terms | null {
  const data = isRec(body) ? body['data'] : null;
  if (!Array.isArray(data)) throw new Error('terms: unexpected response shape');
  const candidates = data.map(parseItem).filter((c): c is Candidate => c !== null);
  if (candidates.length > 1) console.warn('terms: more than one published entry for the country, the most recent is shown');
  candidates.sort((a, b) => b.publishedAt - a.publishedAt);
  return candidates[0]?.terms ?? null;
}

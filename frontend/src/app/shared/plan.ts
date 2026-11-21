import type { Plan } from './plan.model';

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonBlank = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

const KEY_PATTERN = /^[a-z][a-z0-9-]*$/;
const MAX_BASE_PRICE = 2_147_483_647;

/** The non-blank labels of a component list; blank items are skipped with a warning. */
function labelsOf(key: string, attribute: string, raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const labels: string[] = [];
  let skipped = false;
  for (const item of raw) {
    if (isRec(item) && isNonBlank(item['label'])) labels.push(item['label']);
    else skipped = true;
  }
  if (skipped) console.warn(`plans: "${key}" skipped a blank line in ${attribute}`);
  return labels;
}

/** A plan, `'inactive'` when it is not offered, or the name of the first invalid attribute. */
function parseItem(raw: unknown): Plan | 'inactive' | string {
  if (!isRec(raw)) return 'item';
  if (raw['isActive'] !== true) return 'inactive';
  const key = raw['key'];
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) return 'key';
  if (!isNonBlank(raw['name'])) return 'name';
  if (!isNonBlank(raw['shortDescription'])) return 'shortDescription';
  const price = raw['basePrice'];
  if (typeof price !== 'number' || !Number.isInteger(price) || price < 1 || price > MAX_BASE_PRICE) return 'basePrice';
  const sortOrder = raw['sortOrder'];
  if (typeof sortOrder !== 'number' || !Number.isInteger(sortOrder)) return 'sortOrder';
  const coverages = labelsOf(key, 'coverages', raw['coverages']);
  if (coverages === null || coverages.length === 0) return 'coverages';
  const rawBenefits = raw['benefits'];
  const benefits = rawBenefits === null || rawBenefits === undefined ? [] : labelsOf(key, 'benefits', rawBenefits);
  if (benefits === null) return 'benefits';
  return {
    key,
    name: raw['name'],
    shortDescription: raw['shortDescription'],
    basePrice: price,
    sortOrder,
    isRecommended: raw['isRecommended'] === true,
    coverages,
    benefits,
  };
}

/**
 * Boundary validation of the plans response (spec 7.2, US-02-Q-18). Returns the offered plans
 * (`isActive` is `true`), sorted by `sortOrder` then `key`; the server sort is not trusted. A
 * malformed plan is dropped with a warning that names its key and the attribute, never a value.
 * For a repeated key the first in display order wins. Throws when the body is not a list at all
 * (the page then shows its error state).
 */
export function parsePlans(body: unknown): Plan[] {
  const data = isRec(body) ? body['data'] : null;
  if (!Array.isArray(data)) throw new Error('plans: unexpected response shape');
  const parsed: Plan[] = [];
  for (const raw of data) {
    const result = parseItem(raw);
    if (result === 'inactive') continue;
    if (typeof result === 'string') {
      const key = isRec(raw) && typeof raw['key'] === 'string' ? raw['key'] : '(unreadable)';
      console.warn(`plans: "${key}" dropped (invalid ${result})`);
    } else {
      parsed.push(result);
    }
  }
  parsed.sort((a, b) => a.sortOrder - b.sortOrder || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const seen = new Set<string>();
  const plans = parsed.filter((plan) => {
    if (seen.has(plan.key)) {
      console.warn(`plans: "${plan.key}" dropped (duplicated key)`);
      return false;
    }
    seen.add(plan.key);
    return true;
  });
  const flagged = plans.filter((p) => p.isRecommended);
  if (flagged.length > 1) console.warn(`plans: ${flagged.length} plans are flagged as recommended, only "${flagged[0].key}" is highlighted`);
  return plans;
}

/** The first flagged plan in display order, or `null` when none is flagged (US-02-Q-09). */
export function recommendedPlanKey(plans: readonly Plan[]): string | null {
  return plans.find((p) => p.isRecommended)?.key ?? null;
}

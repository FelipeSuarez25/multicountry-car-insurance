import { FieldConfig, RawValue } from './field-config';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface YMD { y: number; m: number; d: number }

/** Strict ISO date parse (rejects 2026-02-31). */
export function parseIsoDate(s: string): YMD | null {
  const m = ISO.exec(s);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? { y, m: mo, d } : null;
}

/** Completed years on today's LOCAL date. 29 Feb birthdays turn a year older on 1 Mar in non-leap years. */
export function ageOn(birth: YMD, today: Date): number {
  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate();
  return ty - birth.y - (tm < birth.m || (tm === birth.m && td < birth.d) ? 1 : 0);
}

export function isEmpty(cfg: FieldConfig, v: RawValue): boolean {
  if (cfg.type === 'checkbox') return v !== true;
  return typeof v !== 'string' || v.trim() === '';
}

/** Returns the message of the first failing check, or null. `required` first, then rules in config order. */
export function validateField(cfg: FieldConfig, v: RawValue, today: Date): string | null {
  const empty = isEmpty(cfg, v);
  if (empty) return cfg.isRequired ? (cfg.requiredMessage ?? cfg.errorMessage) : null; // optional empty skips all rules
  const s = typeof v === 'string' ? v.trim() : '';
  if (cfg.type === 'number') {
    const n = Number(s);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return cfg.errorMessage;
  }
  if (cfg.type === 'date') {
    if (!parseIsoDate(s)) return cfg.errorMessage;
  }
  if (cfg.type === 'select' && !cfg.options?.some(o => o.value === s)) return cfg.errorMessage;
  for (const r of cfg.rules) {
    const msg = r.message ?? cfg.errorMessage;
    switch (r.kind) {
      case 'minLength': if (s.length < r.value) return msg; break;
      case 'maxLength': if (s.length > r.value) return msg; break;
      case 'min': if (Number(s) < r.value) return msg; break;
      case 'max': if (Number(s) > r.value) return msg; break;
      case 'pattern': if (!new RegExp(`^(?:${r.value})$`).test(s)) return msg; break;
      case 'minAge': if (ageOn(parseIsoDate(s)!, today) < r.years) return msg; break;
      case 'yearRange': {
        const y = today.getFullYear(), n = Number(s);
        if (n < y - r.maxYearsOld || n > y + r.maxYearsAhead) return msg;
        break;
      }
      case 'rutCheckDigit': break; // out of scope for the spike
    }
  }
  return null;
}

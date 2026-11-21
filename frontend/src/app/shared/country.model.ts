/** A published `country` entry of the content API (ADR-0001). */
export interface Country {
  code: string;
  name: string;
  currencyCode: string;
  locale: string;
  sortOrder: number;
}

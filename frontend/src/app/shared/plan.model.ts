/** A plan the business team offers in one country (spec 7.2). Produced by `parsePlans`. */
export interface Plan {
  key: string;
  name: string;
  shortDescription: string;
  /** Whole currency units of the country, 1 to 2 147 483 647. */
  basePrice: number;
  sortOrder: number;
  isRecommended: boolean;
  coverages: string[];
  benefits: string[];
}

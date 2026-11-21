import type { RichTextBlock } from './rich-text-blocks.model';

/** The terms and conditions to show for one country (spec 7.2). Produced by `parseTerms`. */
export interface Terms {
  title: string;
  blocks: RichTextBlock[];
}

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RichTextBlock } from './rich-text-blocks.model';

type HeadingLevel = 2 | 3 | 4 | 5 | 6;
const MAX_HEADING_LEVEL = 6;

/**
 * Renders the whitelisted tree of `parseRichTextBlocks` (ADR-0009). Element names come from fixed
 * template branches and content reaches the DOM only as text interpolation: there is no HTML
 * string path, no attribute or property bound to content, and no sanitiser bypass.
 */
@Component({
  selector: 'app-rich-text',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rich-text.html',
  styleUrl: './rich-text.css',
})
export class RichText {
  /** The parsed blocks to show. */
  readonly blocks = input.required<readonly RichTextBlock[]>();
  /** The level of a heading of depth 0; a heading is `min(6, headingLevel + depth)`. */
  readonly headingLevel = input<HeadingLevel>(3);

  protected levelOf(depth: number): number {
    return Math.min(MAX_HEADING_LEVEL, this.headingLevel() + depth);
  }
}

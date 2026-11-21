/** The logical, whitelisted tree of editor text (ADR-0009). Never the wire objects. */
export interface RichTextSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

export interface RichTextListItem {
  spans: RichTextSpan[];
  lists: RichTextList[];
}

export interface RichTextList {
  ordered: boolean;
  items: RichTextListItem[];
}

export type RichTextBlock =
  | { kind: 'paragraph'; spans: RichTextSpan[] }
  | { kind: 'heading'; depth: number; spans: RichTextSpan[] }
  | { kind: 'list'; list: RichTextList };

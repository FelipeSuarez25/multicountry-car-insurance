#!/usr/bin/env python3
"""Check that specs/US-NN/story.md files are verbatim transcriptions of the assessment PDF.

Usage (run with `python3 -I` so nothing is imported from the current directory):
    python3 -I scripts/check-story-fidelity.py <assessment.pdf> specs/US-01/story.md [...]

How it works (deterministic, no AI):
  1. `pdftotext -enc UTF-8` extracts the PDF text (requires poppler).
  2. Page furniture is removed (the "English" header and the "Page N of 9" footers).
  3. From each story, the provenance comment, the code fences and the Markdown markers are removed.
  4. Both texts are tokenised into words and punctuation (curly quotes kept). The story's tokens
     must appear as one contiguous run in the PDF tokens. Whitespace and line wraps are ignored
     on purpose: joining wrapped lines is the only allowed change.

Exits 1 if any story differs from the PDF or cannot be located in it.
"""
import re
import subprocess
import sys

TOKEN = re.compile(r"[\w’‘“”()-]+|[.,:;!?]")


def pdf_tokens(pdf_path: str) -> list[str]:
    text = subprocess.run(
        ["pdftotext", "-enc", "UTF-8", pdf_path, "-"],
        check=True, capture_output=True, text=True,
    ).stdout
    text = re.sub(r"Page \d+ of \d+", " ", text)
    text = re.sub(r"\bEnglish\b", " ", text)
    return TOKEN.findall(text)


def story_tokens(path: str) -> list[str]:
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    text = re.sub(r"```\w*", " ", text)
    text = re.sub(r"(?m)^#+ ", " ", text)
    text = re.sub(r"(?m)^- ", " ", text)
    return TOKEN.findall(text)


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    source = pdf_tokens(sys.argv[1])
    failed = False
    for story in sys.argv[2:]:
        tokens = story_tokens(story)
        head = tokens[:6]
        starts = [i for i in range(len(source)) if source[i:i + len(head)] == head]
        if not starts:
            print(f"FAIL {story}: start not found in PDF ({' '.join(head)} …)")
            failed = True
            continue
        best = None
        for start in starts:
            segment = source[start:start + len(tokens)]
            diffs = [(k, a, b) for k, (a, b) in enumerate(zip(tokens, segment)) if a != b]
            if len(segment) < len(tokens):
                diffs.append((len(segment), "<story continues>", "<PDF ended>"))
            if best is None or len(diffs) < len(best):
                best = diffs
        if best:
            failed = True
            print(f"FAIL {story}: {len(best)} difference(s) in {len(tokens)} tokens")
            for k, ours, theirs in best[:10]:
                print(f"     token {k}: story={ours!r} pdf={theirs!r}")
        else:
            print(f"OK   {story}: {len(tokens)} tokens identical to the PDF")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

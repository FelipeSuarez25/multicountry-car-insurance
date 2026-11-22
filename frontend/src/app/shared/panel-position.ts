import { Injector } from '@angular/core';
import type { BreakpointObserver } from '@angular/cdk/layout';
import { createFlexibleConnectedPositionStrategy, createGlobalPositionStrategy, type PositionStrategy } from '@angular/cdk/overlay';

/**
 * Where the panel of a select or of the calendar goes (ADR-0012 sections 3 and 4): an anchored
 * popover from `--breakpoint-sheet` up (37.5em = 600 CSS px), a bottom sheet below it. The query
 * repeats the token because a custom property cannot be read in a media query.
 */
export const WIDE_QUERY = '(min-width: 37.5em)';

/** The gap between the control and its popover, in CSS px. */
const GAP = 4;

export function isWideViewport(observer: BreakpointObserver): boolean {
  return observer.isMatched(WIDE_QUERY);
}

/**
 * True when the room under the control is smaller than the popover (plus the gaps), so the page
 * should scroll the control up before the popover opens (ADR-0014 section 1, US-04-AC-24). Pure.
 */
export function needsScrollBeforeOpen(controlBottom: number, viewportHeight: number, panelHeight: number, gap: number): boolean {
  return controlBottom + panelHeight + gap > viewportHeight;
}

/** The length of a root custom property in CSS px (`rem` or `px`), or 0 when it is not declared. */
function rootLengthPx(name: string): number {
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith('rem') ? value * parseFloat(getComputedStyle(root).fontSize) : value;
}

/** The sticky header's height plus its gap: the top of the room a popover may use (`scroll-padding-top` of `html`). */
function headerOffsetPx(): number {
  const value = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Before a wide popover opens: when the room under the control is short, scroll the control to just
 * under the sticky header (`scroll-padding-top`), instantly and with no motion, so the popover can
 * open directly below it (ADR-0014 section 1).
 */
export function revealRoomBelow(control: HTMLElement): void {
  const panelHeight = rootLengthPx('--size-calendar-max-height');
  if (needsScrollBeforeOpen(control.getBoundingClientRect().bottom, window.innerHeight, panelHeight, GAP * 2)) {
    control.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

/**
 * A popover under the control, or above it only when it cannot fit below (the fit area excludes the
 * sticky header, so it never covers it), or the viewport bottom for a sheet.
 */
export function panelPositionStrategy(injector: Injector, origin: HTMLElement, sheet: boolean): PositionStrategy {
  if (sheet) return createGlobalPositionStrategy(injector).bottom('0');
  return createFlexibleConnectedPositionStrategy(injector, origin)
    .withPositions([
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: GAP },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -GAP },
    ])
    .withFlexibleDimensions(false)
    .withPush(true)
    .withViewportMargin({ top: headerOffsetPx() || GAP, bottom: GAP, start: GAP, end: GAP });
}

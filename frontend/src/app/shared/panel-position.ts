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

/** A popover under the control (above it when there is no room), or the viewport bottom for a sheet. */
export function panelPositionStrategy(injector: Injector, origin: HTMLElement, sheet: boolean): PositionStrategy {
  if (sheet) return createGlobalPositionStrategy(injector).bottom('0');
  return createFlexibleConnectedPositionStrategy(injector, origin)
    .withPositions([
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: GAP },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -GAP },
    ])
    .withFlexibleDimensions(false)
    .withPush(true)
    .withViewportMargin(GAP);
}

import { TemplatePortal } from '@angular/cdk/portal';
import { createOverlayRef, createRepositionScrollStrategy, type OverlayRef } from '@angular/cdk/overlay';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Directive, Injector, OnDestroy, OnInit, TemplateRef, ViewContainerRef, inject, input, output } from '@angular/core';
import { isWideViewport, panelPositionStrategy } from './panel-position';

/** What the template of a panel knows: whether it is a bottom sheet (then it shows a "Cerrar" button). */
export interface PanelContext {
  sheet: boolean;
}

/**
 * Shows its template in a CDK overlay for as long as it exists (it sits inside the popup template
 * of the combobox, which Angular Aria renders only while the list is open). Anchored popover from
 * `--breakpoint-sheet` up, bottom sheet with a backdrop below it (ADR-0012 section 3). Created
 * with `disableAnimations: true` (ADR-0013 section 3).
 */
@Directive({ selector: 'ng-template[appPanelOverlay]' })
export class PanelOverlay implements OnInit, OnDestroy {
  static ngTemplateContextGuard(_directive: PanelOverlay, _context: unknown): _context is PanelContext {
    return true;
  }

  /** The control the popover hangs from. */
  readonly origin = input.required<HTMLElement>({ alias: 'appPanelOverlay' });
  /** Asks the owner to close: a pointer outside the panel, or the backdrop. */
  readonly dismissed = output<void>();

  private readonly injector = inject(Injector);
  private readonly template = inject<TemplateRef<PanelContext>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private ref: OverlayRef | null = null;

  ngOnInit(): void {
    const origin = this.origin();
    const sheet = !isWideViewport(this.breakpoints);
    const ref = createOverlayRef(this.injector, {
      positionStrategy: panelPositionStrategy(this.injector, origin, sheet),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      hasBackdrop: sheet,
      backdropClass: 'app-backdrop',
      panelClass: sheet ? 'app-sheet' : 'app-popover',
      width: sheet ? undefined : origin.offsetWidth,
      disableAnimations: true,
      // The sheet is positioned against the viewport: a top-layer popover host would size to its content.
      usePopover: sheet ? false : undefined,
      disposeOnNavigation: true,
    });
    ref.attach(new TemplatePortal(this.template, this.container, { sheet }));
    ref.outsidePointerEvents().subscribe((event) => {
      // A press on the control itself is the combobox's own toggle, not a dismissal.
      if (!(event.target instanceof Node) || !origin.contains(event.target)) this.dismissed.emit();
    });
    ref.backdropClick().subscribe(() => this.dismissed.emit());
    this.ref = ref;
  }

  ngOnDestroy(): void {
    this.ref?.dispose();
    this.ref = null;
  }
}

import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, inject, input, model, output, signal, viewChild } from '@angular/core';
import { transformedValue, type FormValueControl } from '@angular/forms/signals';
import { LucideCalendarDays } from '@lucide/angular';
import { Calendar, type CalendarData } from './calendar';
import { formatDateText, parseDateText } from './date-text';
import type { FieldConfig } from './field-config.model';
import { isWideViewport, panelPositionStrategy } from './panel-position';
import { CLOCK } from '../core/clock';

/**
 * The design-system date field (ADR-0012 section 4): a text box for typed dd/mm/aaaa and an
 * "Elegir fecha" button that opens the calendar dialog. The model is the ISO `YYYY-MM-DD` date or
 * `''`, as the native date input held it. Text that is not a complete, existing date maps to `''`
 * with a parse error, so the field is invalid while the text stays visible (the former `badInput`,
 * US-04-BR-06). The shown text is a `transformedValue`; its `format` keeps what was typed while it
 * still stands for the model value, so writing `''` for unreadable text never erases it.
 */
@Component({
  selector: 'app-date-field',
  imports: [LucideCalendarDays],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(focusout)': 'onFocusout($event)' },
  styleUrl: './date-field.css',
  templateUrl: './date-field.html',
})
export class DateField implements FormValueControl<string> {
  readonly value = model<string>('');
  readonly touch = output<void>();

  readonly controlId = input.required<string>();
  readonly config = input.required<FieldConfig>();
  readonly localeTag = input.required<string>();
  readonly hasIcon = input(false);
  readonly ariaRequired = input(false);
  readonly ariaInvalid = input(false);
  readonly ariaDescribedby = input<string | null>(null);

  private readonly dialog = inject(Dialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly injector = inject(Injector);
  private readonly clock = inject(CLOCK);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');
  private readonly opener = viewChild.required<ElementRef<HTMLButtonElement>>('opener');
  private lastTyped = '';
  protected readonly calendarOpen = signal(false);

  /** What the text box shows, kept in step with the model. */
  protected readonly text = transformedValue<string, string>(this.value, {
    parse: (typed) => {
      this.lastTyped = typed;
      const iso = parseDateText(typed);
      return iso === null ? { value: '', error: { kind: 'parse', message: '' } } : { value: iso };
    },
    format: (iso) => ((parseDateText(this.lastTyped) ?? '') === iso ? this.lastTyped : formatDateText(iso)),
  });

  focus(options?: FocusOptions): void {
    this.box().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }

  /** A readable text is shown in the display format when the person leaves the box. */
  protected onBlur(): void {
    const iso = parseDateText(this.text());
    if (iso) this.text.set(formatDateText(iso));
  }

  protected onFocusout(event: FocusEvent): void {
    if (this.calendarOpen()) return;
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.nativeElement.contains(next)) return;
    this.touch.emit();
  }

  protected open(): void {
    const origin = this.box().nativeElement;
    const sheet = !isWideViewport(this.breakpoints);
    const titleId = `${this.controlId()}-calendar-title`;
    const data: CalendarData = { config: this.config(), today: this.clock(), localeTag: this.localeTag(), value: this.value(), titleId, sheet };
    this.calendarOpen.set(true);
    const ref = this.dialog.open(Calendar, {
      data,
      injector: this.injector,
      ariaModal: true,
      ariaLabelledBy: titleId,
      autoFocus: false,
      restoreFocus: this.opener().nativeElement,
      hasBackdrop: true,
      backdropClass: 'app-backdrop',
      panelClass: sheet ? 'app-sheet' : 'app-popover',
      positionStrategy: panelPositionStrategy(this.injector, origin, sheet),
      disableAnimations: true,
    });
    ref.closed.subscribe((iso) => {
      this.calendarOpen.set(false);
      if (typeof iso === 'string') this.value.set(iso);
      this.touch.emit();
    });
  }
}

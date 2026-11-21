import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Listbox, Option } from '@angular/aria/listbox';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { LucideCalendarDays, LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import { isDayDisabled, latestValidDate, longDateName, monthGrid, monthName, moveToYear, nextFocusDate, partsOf, shortWeekdays, yearRange } from './calendar-dates';
import type { FieldConfig } from './field-config.model';

/** What the date field hands to the dialog (ADR-0012 section 4). */
export interface CalendarData {
  config: FieldConfig;
  today: Date;
  localeTag: string;
  /** The stored ISO date, or `''`. */
  value: string;
  /** The id of the element that names the dialog: the visible month and year. */
  titleId: string;
  /** A bottom sheet (narrow screens) or an anchored popover. */
  sheet: boolean;
}

const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];

/**
 * The content of the calendar dialog: a WAI-ARIA date picker (ADR-0012 section 4). The month grid is
 * a roving-tabindex grid driven by the pure `nextFocusDate`; the year selector is a listbox on
 * `@angular/aria`. A day is disabled if and only if the field's validator rejects it. The dialog
 * closes with the chosen ISO date, or with nothing.
 */
@Component({
  selector: 'app-calendar',
  imports: [Listbox, Option, LucideCalendarDays, LucideChevronLeft, LucideChevronRight, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})
export class Calendar {
  protected readonly data = inject<CalendarData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<string | undefined>>(DialogRef);
  private readonly injector = inject(Injector);
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');

  private readonly latest = latestValidDate(this.data.config, this.data.today);
  private readonly stored = this.data.value !== '' && !isDayDisabled(this.data.config, this.data.value, this.data.today) ? this.data.value : null;
  /** The day that has the roving tabindex and the keyboard focus. */
  protected readonly focused = signal(this.stored ?? this.latest);
  protected readonly choosingYear = signal(false);

  protected readonly years = computed(() => {
    const { from, to } = yearRange(this.data.config, this.data.today);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
  protected readonly title = computed(() => monthName(this.focused(), this.data.localeTag));
  protected readonly selectedYear = computed(() => [partsOf(this.focused()).year]);
  protected readonly short = shortWeekdays(this.data.localeTag);
  protected readonly grid = computed(() => {
    const { year, month } = partsOf(this.focused());
    const { weekdays, weeks } = monthGrid(year, month, this.data.localeTag);
    return {
      weekdays,
      weeks: weeks.map((week) =>
        week.map((iso) =>
          iso === null
            ? null
            : {
                iso,
                day: partsOf(iso).day,
                name: longDateName(iso, this.data.localeTag),
                selected: iso === this.data.value,
                disabled: isDayDisabled(this.data.config, iso, this.data.today),
              },
        ),
      ),
    };
  });

  constructor() {
    afterNextRender(() => this.focusDay());
  }

  protected focusDay(): void {
    const cell = this.root().nativeElement.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]');
    cell?.focus();
  }

  protected moveMonth(direction: -1 | 1): void {
    this.focused.set(nextFocusDate(this.focused(), direction === -1 ? 'PageUp' : 'PageDown', false, this.data.localeTag));
  }

  /** Escape closes the dialog and keeps the value (the CDK also listens, by key code). */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.close();
  }

  /** Keys on the day `from`, which is the focused one (a click or a script may focus another cell first). */
  protected onGridKeydown(event: KeyboardEvent, from: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.choose(from);
      return;
    }
    if (!MOVE_KEYS.includes(event.key)) return;
    event.preventDefault();
    this.focused.set(nextFocusDate(from, event.key, event.shiftKey, this.data.localeTag));
    afterNextRender(() => this.focusDay(), { injector: this.injector });
  }

  protected choose(iso: string): void {
    if (isDayDisabled(this.data.config, iso, this.data.today)) return;
    this.ref.close(iso);
  }

  protected toggleYears(): void {
    this.choosingYear.update((v) => !v);
    if (this.choosingYear()) {
      afterNextRender(() => this.root().nativeElement.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus(), { injector: this.injector });
    }
  }

  protected pickYear(years: readonly number[]): void {
    const year = years[0] ?? partsOf(this.focused()).year;
    this.focused.set(moveToYear(this.focused(), year));
    this.choosingYear.set(false);
    afterNextRender(() => this.focusDay(), { injector: this.injector });
  }

  protected close(): void {
    this.ref.close(undefined);
  }
}

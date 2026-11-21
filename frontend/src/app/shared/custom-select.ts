import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { LucideCheck, LucideChevronDown, LucideX } from '@lucide/angular';
import type { SelectOption } from './field-config.model';
import { PanelOverlay } from './panel-overlay';
import { SEARCH_THRESHOLD, filterOptions, normaliseForSearch } from './select-search';

/** The empty value of a select: its shown text, never an option (US-04-BR-05). */
export const SELECT_PROMPT = 'Selecciona una opción';
const SEARCH_PLACEHOLDER = 'Escribe para buscar';

/**
 * The design-system select (ADR-0012 section 3): a WAI-ARIA combobox with a listbox popup built
 * on `@angular/aria`. Below `SEARCH_THRESHOLD` options it is select-only (a `<button>`); from there
 * it is editable and filters the list (an `<input>`). The focused element is the one the field's
 * `<label for>` points at. The model is the option `value` (or `''`), exactly as the native select
 * held it (US-04-BR-07). It never declares `invalid`, `required`, `touched` or `disabled` inputs:
 * the form passes what is shown (ADR-0012 section 5).
 */
@Component({
  selector: 'app-custom-select',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, PanelOverlay, LucideCheck, LucideChevronDown, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './custom-select.css',
  templateUrl: './custom-select.html',
})
export class CustomSelect implements FormValueControl<string> {
  /** The stored value: an option `value`, or `''`. */
  readonly value = model<string>('');
  /** Emitted when the focus leaves the control (Signal Forms marks the field touched). */
  readonly touch = output<void>();

  readonly controlId = input.required<string>();
  readonly labelId = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly hasIcon = input(false);
  readonly ariaRequired = input(false);
  readonly ariaInvalid = input(false);
  readonly ariaDescribedby = input<string | null>(null);

  protected readonly prompt = SELECT_PROMPT;
  protected readonly searchPlaceholder = SEARCH_PLACEHOLDER;
  protected readonly expanded = signal(false);
  /** The text of the editable combobox: the chosen label while closed, what is typed while open. */
  protected readonly text = signal('');
  /** The typed filter; `null` until the person types, so opening shows every option. */
  protected readonly filterText = signal<string | null>(null);

  protected readonly searchable = computed(() => this.options().length >= SEARCH_THRESHOLD);
  protected readonly selectedLabel = computed(() => this.options().find((o) => o.value === this.value())?.label ?? '');
  protected readonly shown = computed(() => filterOptions(this.options(), this.filterText() ?? ''));
  protected readonly selection = computed(() => (this.value() === '' ? [] : [this.value()]));

  private readonly control = viewChild<ElementRef<HTMLElement>>('control');
  private readonly listbox = viewChild(Listbox);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly injector = inject(Injector);
  private typed = '';
  private typedAt = 0;
  private pendingActive: string | null = null;

  constructor() {
    // Closed, the editable box shows the chosen label and no filter is kept (Escape, leaving, choosing).
    effect(() => {
      if (this.expanded()) return;
      const label = this.selectedLabel();
      untracked(() => {
        this.filterText.set(null);
        this.text.set(label);
      });
    });
    // The result count, or the empty text, is announced politely while filtering (US-04-AC-07).
    effect(() => {
      const typed = this.filterText();
      if (typed === null) return;
      const count = this.shown().length;
      untracked(() => this.announcer.announce(count === 0 ? this.emptyText(typed) : count === 1 ? '1 opción' : `${count} opciones`, 'polite'));
    });
    // The first match is active after every change of the filter, or the match of the first key typed on a closed select.
    effect(() => {
      const listbox = this.listbox();
      this.shown();
      if (!listbox) return;
      const typing = untracked(() => this.filterText() !== null);
      const wanted = untracked(() => this.pendingActive);
      if (!typing && wanted === null) return;
      afterNextRender(() => {
        if (wanted !== null) {
          const index = this.shown().findIndex((o) => o.value === wanted);
          if (index >= 0) listbox.gotoIndex(index);
          this.pendingActive = null;
        } else {
          listbox.gotoFirst();
        }
      }, { injector: this.injector });
    });
  }

  protected emptyText(typed: string): string {
    return `No encontramos opciones para «${typed.trim()}».`;
  }

  protected optionId(option: SelectOption): string {
    return `${this.controlId()}-option-${option.value}`;
  }

  focus(options?: FocusOptions): void {
    this.control()?.nativeElement.focus(options);
  }

  protected openOnClick(): void {
    if (!this.expanded()) this.expanded.set(true);
  }

  /**
   * The combobox toggles on a click. A click that carries no pointer (`detail` 0: a script, or
   * assistive technology activating the control) only ever opens the list, so activating an open
   * select leaves it open; a mouse or touch press on an open one still closes it.
   */
  protected onButtonClick(event: MouseEvent): void {
    if (event.detail !== 0) return;
    // After the combobox's own toggle, whatever the order of the two listeners.
    queueMicrotask(() => {
      if (!this.expanded()) this.expanded.set(true);
    });
  }

  protected onInput(event: Event): void {
    this.filterText.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.expanded()) {
      if (event.key === 'Tab') {
        this.commit(this.activeValue());
        this.expanded.set(false);
      }
      return;
    }
    if ((event.altKey && event.key === 'ArrowDown') || (this.searchable() && event.key === 'Enter')) {
      // Enter in the collapsed search box opens the list and never submits the form (US-04-AC-06).
      event.preventDefault();
      this.expanded.set(true);
      return;
    }
    // A printable key on a collapsed select-only select opens it on the first match (US-04-AC-06).
    if (!this.searchable() && event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      this.typed = now - this.typedAt > 500 ? event.key : this.typed + event.key;
      this.typedAt = now;
      const wanted = normaliseForSearch(this.typed);
      this.pendingActive = this.options().find((o) => normaliseForSearch(o.label).startsWith(wanted))?.value ?? null;
      this.expanded.set(true);
    }
  }

  /** The option the list has as active, by the id `aria-activedescendant` points at. */
  private activeValue(): string | null {
    const id = this.control()?.nativeElement.getAttribute('aria-activedescendant');
    return this.options().find((o) => this.optionId(o) === id)?.value ?? null;
  }

  /** A change of the listbox selection: choosing a row (click, Enter, Space). Clicking the chosen row again keeps it. */
  protected pick(values: readonly string[]): void {
    this.commit(values[0] ?? this.value());
    this.expanded.set(false);
    this.focus();
  }

  protected close(): void {
    this.expanded.set(false);
    this.focus();
  }

  private commit(value: string | null): void {
    if (value !== null && value !== '' && value !== this.value()) this.value.set(value);
  }

  protected onFocusout(): void {
    this.touch.emit();
  }
}

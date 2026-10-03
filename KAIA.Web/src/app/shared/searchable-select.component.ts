import {
  Component, ElementRef, EventEmitter, Input, NgZone, Output,
  computed, forwardRef, inject, signal, viewChild, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableOption {
  value: number;
  label: string;
  sublabel?: string;
  meta?: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="ss" [class.ss--open]="open()">
      <div class="ss__trigger" (click)="toggle($event)">
        @if (selectedLabel()) {
          <div class="ss__selected">
            <div class="ss__selected-label">{{ selectedLabel() }}</div>
            @if (selectedSublabel()) {
              <div class="ss__selected-sub">{{ selectedSublabel() }}</div>
            }
          </div>
        } @else {
          <div class="ss__placeholder">{{ placeholder }}</div>
        }
        <svg class="ss__caret" width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      @if (open()) {
        <div class="ss__panel" (mousedown)="$event.stopPropagation()">
          <div class="ss__search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-3.5-3.5"/>
            </svg>
            <input #searchInput
                   class="ss__search"
                   type="text"
                   placeholder="Search..."
                   [value]="query()"
                   (input)="onQueryInput($event)"
                   (keydown)="onKeyDown($event)"
                   autocomplete="off" />
          </div>

          <div class="ss__list">
            @if (filtered().length === 0) {
              <div class="ss__empty">No matches.</div>
            } @else {
              @for (opt of filtered(); track opt.value; let i = $index) {
                <div class="ss__item"
                     [class.ss__item--active]="i === highlightIndex()"
                     [class.ss__item--selected]="opt.value === value()"
                     (click)="select(opt, $event)"
                     (mouseenter)="highlightIndex.set(i)">
                  <div class="ss__item-body">
                    <div class="ss__item-label">{{ opt.label }}</div>
                    @if (opt.sublabel) {
                      <div class="ss__item-sub">{{ opt.sublabel }}</div>
                    }
                  </div>
                  @if (opt.meta) {
                    <div class="ss__item-meta">{{ opt.meta }}</div>
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .ss { position: relative; width: 100%; }

    .ss__trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 40px;
      padding: 6px 12px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      transition: border-color .15s, box-shadow .15s;
    }

    .ss--open .ss__trigger {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.10);
    }

    .ss__selected { flex: 1; min-width: 0; }
    .ss__selected-label {
      font-size: 14px;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ss__selected-sub {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-top: 1px;
    }

    .ss__placeholder {
      flex: 1;
      font-size: 14px;
      color: var(--color-text-muted);
    }

    .ss__caret {
      flex-shrink: 0;
      color: var(--color-text-muted);
      transition: transform .15s;
    }
    .ss--open .ss__caret { transform: rotate(180deg); }

    .ss__panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      z-index: 70;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: ss-in .12s ease-out;
    }

    @keyframes ss-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ss__search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface-2);
      color: var(--color-text-muted);
    }

    .ss__search {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 13px;
      font-family: inherit;
      color: var(--color-text);
    }
    .ss__search::placeholder { color: var(--color-text-muted); }

    .ss__list {
      max-height: 260px;
      overflow-y: auto;
      padding: 4px;
      scrollbar-width: thin;
      scrollbar-color: var(--color-border-strong) transparent;
    }
    .ss__list::-webkit-scrollbar { width: 6px; }
    .ss__list::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 3px; }

    .ss__empty {
      padding: 20px 12px;
      text-align: center;
      font-size: 13px;
      color: var(--color-text-muted);
      font-style: italic;
    }

    .ss__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background-color .1s;
    }

    .ss__item:hover,
    .ss__item--active { background: var(--color-surface-2); }
    .ss__item--selected { background: var(--color-primary-light); }
    .ss__item-body { flex: 1; min-width: 0; }

    .ss__item-label {
      font-size: 13px;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ss__item-sub {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-top: 1px;
    }

    .ss__item-meta {
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .ss__item--selected .ss__item-label {
      color: var(--color-primary);
      font-weight: 600;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() options: SearchableOption[] = [];
  @Input() placeholder = 'Select...';

  /** Emitted every time the user picks an option — mirrors the CVA change. */
  @Output() valueChange = new EventEmitter<number>();

  private readonly host        = inject(ElementRef<HTMLElement>);
  private readonly zone        = inject(NgZone);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly open           = signal(false);
  readonly query          = signal('');
  readonly value          = signal<number>(0);
  readonly highlightIndex = signal(0);

  readonly selectedOption = computed(() =>
    this.options.find(o => o.value === this.value()) ?? null
  );

  readonly selectedLabel    = computed(() => this.selectedOption()?.label ?? '');
  readonly selectedSublabel = computed(() => this.selectedOption()?.sublabel ?? '');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel ?? '').toLowerCase().includes(q) ||
      (o.meta ?? '').toLowerCase().includes(q)
    );
  });

  private onChange: (v: number) => void = () => {};
  private onTouched: () => void = () => {};

  // ─── ControlValueAccessor ──────────────────────────────────────────
  writeValue(v: number | null): void {
    this.value.set(v ?? 0);
  }

  registerOnChange(fn: (v: number) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  // ─── Interactions ──────────────────────────────────────────────────
  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update(v => !v);
    if (this.open()) {
      this.query.set('');
      this.highlightIndex.set(0);
      setTimeout(() => this.searchInput()?.nativeElement.focus(), 20);
    }
  }

  close(): void {
    this.open.set(false);
    this.onTouched();
  }

  onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.highlightIndex.set(0);
  }

  onKeyDown(event: KeyboardEvent): void {
    const list = this.filtered();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex.update(i => Math.min(i + 1, list.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const opt = list[this.highlightIndex()];
      if (opt) this.select(opt, event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  select(opt: SearchableOption, event: Event): void {
    event.stopPropagation();

    this.zone.run(() => {
      this.value.set(opt.value);
      this.onChange(opt.value);
      this.valueChange.emit(opt.value);
      this.onTouched();
      this.open.set(false);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.close();
    }
  }
}
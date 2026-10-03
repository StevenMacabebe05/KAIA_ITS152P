import {
  Component, EventEmitter, HostListener, Input, OnInit, Output,
  computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DistributionApiService } from '../../core/services/distribution-api.service';
import { CauseApiService } from '../../core/services/cause-api.service';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { Distribution } from '../../core/models/distribution.model';
import { Cause } from '../../core/models/cause.model';
import { Item } from '../../core/models/item.model';
import { InventoryItem } from '../../core/models/inventory.model';
import { SearchableSelectComponent, SearchableOption } from '../../shared/searchable-select.component';

interface LineDraft { itemId: number; quantity: number; }

@Component({
  selector: 'app-distribution-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableSelectComponent],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="modal__header">
          <div>
            <h2 class="modal__title">{{ isEdit() ? 'Edit distribution' : 'Record distribution' }}</h2>
            <p class="modal__subtitle">
              {{ isEdit() ? 'Update the details of this distribution.' : 'Record items given out to a recipient.' }}
            </p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="modal__body">
          <div class="grid">

            <!-- LEFT -->
            <div class="col col--left">
              <div class="col__title">Distribution details</div>

              <div class="field">
                <label class="field__label">Cause</label>
                <app-searchable-select
                  formControlName="causeId"
                  placeholder="Select a cause..."
                  [options]="causeOptions()"
                  (valueChange)="syncLineState()" />
                @if (hasError('causeId')) {
                  <div class="field__error">Select a cause.</div>
                }
              </div>

              <div class="field">
                <label class="field__label">Recipient</label>
                <input class="field__input" type="text" formControlName="recipient"
                       placeholder="e.g. Barangay San Isidro"
                       [class.field__input--error]="hasError('recipient')" />
                @if (hasError('recipient')) {
                  <div class="field__error">
                    @if (form.get('recipient')?.hasError('required')) { Enter the recipient. }
                    @else if (form.get('recipient')?.hasError('minlength')) { Recipient must be at least 2 characters. }
                  </div>
                }
              </div>

              <div class="field">
                <label class="field__label">Date distributed</label>
                <input class="field__input" type="date" formControlName="distributedAt" />
              </div>

              <div class="field">
                <label class="field__label">Notes (optional)</label>
                <textarea class="field__input field__textarea" formControlName="notes"
                          placeholder="Any context about this distribution..."
                          rows="4"></textarea>
              </div>
            </div>

            <!-- RIGHT -->
            <div class="col col--right">
              <div class="col__head">
                <div class="col__title">Items distributed</div>
                <button type="button" class="btn btn--outline btn--sm" (click)="addLine()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add item
                </button>
              </div>

              @if (linesArray.length === 0) {
                <div class="lines-empty">
                  No items yet. Click <strong>Add item</strong> to start.
                </div>
              } @else {
                <div class="lines" formArrayName="lines">
                  @for (line of linesArray.controls; track $index; let i = $index) {
                    <div class="line" [formGroupName]="i">
                      <div class="line__index">{{ i + 1 }}</div>

                      <div class="line__item">
                        <app-searchable-select
                          formControlName="itemId"
                          placeholder="Search item..."
                          [options]="itemOptions()"
                          (valueChange)="syncLineState()" />
                        @if (availableStock(i) !== null) {
                          <div class="line__stock"
                               [class.line__stock--warn]="isOverStock(i)">
                            {{ isOverStock(i) ? 'Only ' : 'In stock: ' }}{{ availableStock(i) }}
                          </div>
                        }
                      </div>

                      <div class="line__qty">
                        <input class="field__input"
                               type="number"
                               min="1"
                               step="1"
                               formControlName="quantity"
                               (input)="syncLineState()"
                               [class.field__input--error]="isOverStock(i)" />
                      </div>

                      <div class="line__sub">
                        <div class="line__sub-value">{{ lineQuantity(i) }}</div>
                      </div>

                      <button type="button" class="icon-btn icon-btn--danger"
                              (click)="removeLine(i)" title="Remove line">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              }

              <div class="lines-total">
                <span class="lines-total__label">Total items</span>
                <span class="lines-total__value">{{ totalQuantity() }}</span>
              </div>
            </div>

          </div>

          @if (serverError()) {
            <div class="modal__server-error">{{ serverError() }}</div>
          }
        </form>

        <div class="modal__footer">
          <button type="button" class="btn btn--outline" (click)="close()" [disabled]="submitting()">
            Cancel
          </button>
          <button type="button" class="btn btn--primary"
                  (click)="submit()"
                  [disabled]="submitting() || hasOverStock()">
            {{ submitting() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Save distribution') }}
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 60; padding: 24px;
      animation: fade-in .15s ease;
    }
    .modal {
      width: 100%; max-width: 1100px;
      background: var(--color-surface); color: var(--color-text);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column;
      max-height: calc(100vh - 48px);
      animation: pop-in .18s ease;
    }
    .modal__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 22px 28px 18px;
      border-bottom: 1px solid var(--color-border);
    }
    .modal__title { font-size: 20px; font-weight: 700; color: var(--color-text); margin: 0; }
    .modal__subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 2px; }

    .modal__body { flex: 1; padding: 24px 28px; overflow-y: auto; }

    .grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 32px;
      align-items: start;
    }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

    .col { display: flex; flex-direction: column; gap: 16px; }
    .col--left {
      padding-right: 32px;
      border-right: 1px solid var(--color-border);
    }
    @media (max-width: 900px) {
      .col--left { padding-right: 0; border-right: none; }
    }

    .col__head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px;
    }

    .col__title {
      font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .field { display: flex; flex-direction: column; gap: 6px; }

    .field__label {
      font-size: 12px; font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase; letter-spacing: 0.04em;
    }

    .field__input {
      height: 40px; padding: 0 12px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius);
      background: var(--color-surface);
      font-size: 14px; font-family: inherit;
      color: var(--color-text);
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .field__input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.10);
    }
    .field__input--error { border-color: var(--color-danger) !important; }

    .field__textarea {
      height: auto; min-height: 100px;
      padding: 10px 12px;
      font-family: inherit;
      resize: vertical;
    }

    .field__error { font-size: 12px; color: var(--color-danger); }

    .lines { display: flex; flex-direction: column; gap: 10px; }

    .line {
      display: grid;
      grid-template-columns: 32px 1fr 90px 60px 40px;
      gap: 10px;
      align-items: start;
      padding: 10px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }

    .line__index {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border-radius: 50%;
      background: var(--color-surface-3);
      color: var(--color-text-secondary);
      font-size: 12px; font-weight: 700;
      margin-top: 4px;
    }

    .line__item { display: flex; flex-direction: column; gap: 4px; }

    .line__stock {
      font-size: 11px;
      color: var(--color-text-muted);
      padding-left: 4px;
    }
    .line__stock--warn { color: var(--color-danger); font-weight: 600; }

    .line__qty input { text-align: center; font-weight: 600; width: 100%; }

    .line__sub {
      display: flex; align-items: center; justify-content: center;
      padding-top: 8px;
    }
    .line__sub-value {
      font-size: 14px; font-weight: 700;
      color: var(--color-text);
    }

    .lines-empty {
      text-align: center; padding: 40px 12px;
      font-size: 13px; color: var(--color-text-muted);
      border: 1px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
    }

    .lines-total {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 16px 20px;
      background: var(--color-accent-light);
      border: 1px solid var(--color-accent);
      border-radius: var(--radius-lg);
      margin-top: 4px;
    }
    .lines-total__label {
      font-size: 12px; text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-accent-hover); font-weight: 700;
    }
    .lines-total__value {
      font-size: 22px; font-weight: 700;
      color: var(--color-accent-hover);
      letter-spacing: -0.02em;
    }

    .modal__footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 18px 28px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-2);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }

    .modal__server-error {
      padding: 12px 14px;
      margin-top: 16px;
      background: var(--color-danger-bg); color: var(--color-danger);
      font-size: 13px;
      border-radius: var(--radius); border: 1px solid var(--color-danger);
    }

    .btn--sm { height: 32px; padding: 0 14px; font-size: 12px; }

    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border: 1px solid transparent;
      border-radius: var(--radius);
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: background-color .15s, color .15s, border-color .15s;
      margin-top: 4px;
    }
    .icon-btn--danger:hover {
      background: var(--color-danger-bg);
      color: var(--color-danger);
      border-color: var(--color-danger);
    }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop-in {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to   { opacity: 1; transform: none; }
    }

    :host-context([data-theme="dark"]) {
      .line { background: var(--color-surface-3); }
    }
  `]
})
export class DistributionFormModalComponent implements OnInit {
  @Input() distribution: Distribution | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<Distribution>();

  private readonly fb           = inject(FormBuilder);
  private readonly api          = inject(DistributionApiService);
  private readonly causeApi     = inject(CauseApiService);
  private readonly itemApi      = inject(ItemApiService);
  private readonly inventoryApi = inject(InventoryApiService);

  readonly isEdit      = signal(false);
  readonly submitting  = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly causes    = signal<Cause[]>([]);
  readonly items     = signal<Item[]>([]);
  readonly inventory = signal<InventoryItem[]>([]);

  readonly selectedCauseId = signal<number>(0);
  readonly selectedItemIds = signal<number[]>([]);

  /** Bumped on any line change so the computed values below re-run. */
  private readonly linesVersion = signal(0);

  readonly causeOptions = computed<SearchableOption[]>(() =>
    this.causes().map(c => ({
      value: c.id,
      label: c.title,
      sublabel: c.ngoName,
      meta: c.status
    }))
  );

  readonly itemOptions = computed<SearchableOption[]>(() =>
    this.items().map(i => {
      const inv = this.inventory().find(x => x.itemId === i.id);
      const stock = inv?.stock ?? 0;
      return {
        value: i.id,
        label: i.name,
        sublabel: `${i.code} · ${i.brand}`,
        meta: `Stock: ${stock}`
      };
    })
  );

  readonly form = this.fb.nonNullable.group({
    causeId:       [0, [Validators.required, Validators.min(1)]],
    recipient:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    distributedAt: ['', [Validators.required]],
    notes:         ['', [Validators.maxLength(500)]],
    lines:         this.fb.array<ReturnType<typeof this.makeLineGroup>>([])
  });

  get linesArray(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  readonly totalQuantity = computed(() => {
    this.linesVersion();
    let total = 0;
    for (const ctrl of this.linesArray.controls) {
      total += Number(ctrl.get('quantity')?.value ?? 0);
    }
    return total;
  });

  readonly hasOverStock = computed(() => {
    this.linesVersion();
    for (let i = 0; i < this.linesArray.length; i++) {
      if (this.isOverStock(i)) return true;
    }
    return false;
  });

  ngOnInit(): void {
    this.form.get('causeId')?.valueChanges.subscribe(v => {
      this.selectedCauseId.set(Number(v ?? 0));
    });

    forkJoin({
      causes:    this.causeApi.getAll(),
      items:     this.itemApi.getAll(),
      inventory: this.inventoryApi.getAll()
    }).subscribe({
      next: res => {
        this.causes.set(res.causes);
        this.items.set(res.items);
        this.inventory.set(res.inventory);

        if (this.distribution) {
          this.isEdit.set(true);
          this.form.patchValue({
            causeId:       this.distribution.causeId,
            recipient:     this.distribution.recipient,
            distributedAt: this.distribution.distributedAtUtc.substring(0, 10),
            notes:         this.distribution.notes ?? ''
          });
          this.selectedCauseId.set(this.distribution.causeId);

          for (const line of this.distribution.lines) {
            this.linesArray.push(this.makeLineGroup(line.itemId, line.quantity));
          }
          this.syncLineState();
        } else {
          this.form.patchValue({ distributedAt: new Date().toISOString().substring(0, 10) });
          this.addLine();
        }
      },
      error: (err: ApiError) => {
        this.serverError.set(err.message || 'Could not load reference data.');
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.close(); }

  close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  private makeLineGroup(itemId = 0, quantity = 1) {
    return this.fb.nonNullable.group({
      itemId:   [itemId,   [Validators.required, Validators.min(1)]],
      quantity: [quantity, [Validators.required, Validators.min(1)]]
    });
  }

  addLine(): void {
    this.linesArray.push(this.makeLineGroup());
    this.syncLineState();
  }

  removeLine(index: number): void {
    this.linesArray.removeAt(index);
    this.syncLineState();
  }

  /** Bumps the version signal and refreshes the selectedItemIds signal. */
  syncLineState(): void {
    this.linesVersion.update(v => v + 1);
    this.selectedItemIds.set(
      this.linesArray.controls.map(c => Number(c.get('itemId')?.value ?? 0))
    );
  }

  availableStock(i: number): number | null {
    const itemId = Number(this.linesArray.at(i)?.get('itemId')?.value ?? 0);
    if (!itemId) return null;
    const inv = this.inventory().find(x => x.itemId === itemId);
    return inv?.stock ?? 0;
  }

  isOverStock(i: number): boolean {
    const stock = this.availableStock(i);
    if (stock === null) return false;
    const qty = Number(this.linesArray.at(i)?.get('quantity')?.value ?? 0);
    return qty > stock;
  }

  lineQuantity(i: number): number {
    return Number(this.linesArray.at(i)?.get('quantity')?.value ?? 0);
  }

  hasError(field: 'causeId' | 'recipient' | 'distributedAt' | 'notes'): boolean {
    const c = this.form.get(field);
    return !!c && c.touched && c.invalid;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.linesArray.length === 0) {
      this.serverError.set('Add at least one item to the distribution.');
      return;
    }
    for (let i = 0; i < this.linesArray.length; i++) {
      const itemId = this.linesArray.at(i).get('itemId')?.value;
      if (!itemId || itemId < 1) {
        this.serverError.set(`Line ${i + 1}: please select an item.`);
        return;
      }
      if (this.isOverStock(i)) {
        this.serverError.set(`Line ${i + 1}: quantity exceeds available stock.`);
        return;
      }
    }

    this.submitting.set(true);
    this.serverError.set(null);

    const raw = this.form.getRawValue();
    const distributedIso = new Date(raw.distributedAt + 'T12:00:00.000Z').toISOString();

    const lines: LineDraft[] = this.linesArray.controls.map(c => ({
      itemId:   Number(c.get('itemId')?.value),
      quantity: Number(c.get('quantity')?.value)
    }));

    const payload = {
      causeId:          Number(raw.causeId),
      distributedAtUtc: distributedIso,
      recipient:        raw.recipient.trim(),
      notes:            raw.notes.trim() || null,
      lines
    };

    const req$ = this.isEdit() && this.distribution
      ? this.api.update(this.distribution.id, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: saved => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message || 'Could not save distribution.');
      }
    });
  }
}
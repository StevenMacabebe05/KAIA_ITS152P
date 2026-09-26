import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { Item } from '../../core/models/item.model';

@Component({
  selector: 'app-item-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="modal__header">
          <div>
            <h2 class="modal__title">{{ isEdit() ? 'Edit donation item' : 'Add donation item' }}</h2>
            <p class="modal__subtitle">
              {{ isEdit() ? 'Update the details below.' : 'Fill in the details for the new item.' }}
            </p>
          </div>
          <button class="modal__close" (click)="close()" aria-label="Close">×</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="modal__body">

          <div class="field">
            <label class="field__label">Name</label>
            <input
              class="field__input"
              type="text"
              formControlName="name"
              placeholder="e.g. Canned sardines 155g"
              [class.field__input--error]="hasError('name')"
            />
            @if (hasError('name')) {
              <div class="field__error">
                @if (form.get('name')?.hasError('required')) { Enter an item name. }
                @else if (form.get('name')?.hasError('minlength')) { Name must be at least 2 characters. }
                @else if (form.get('name')?.hasError('maxlength')) { Name must be 100 characters or less. }
              </div>
            }
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field__label">Code</label>
              <input
                class="field__input"
                type="text"
                formControlName="code"
                placeholder="e.g. FD-0231"
                style="text-transform: uppercase;"
                [class.field__input--error]="hasError('code')"
              />
              @if (hasError('code')) {
                <div class="field__error">
                  @if (form.get('code')?.hasError('required')) { Enter a code. }
                  @else if (form.get('code')?.hasError('pattern')) {
                    Format must be two letters, dash, four digits (e.g. FD-0231).
                  }
                </div>
              }
            </div>

            <div class="field">
              <label class="field__label">Brand</label>
              <input
                class="field__input"
                type="text"
                formControlName="brand"
                placeholder="e.g. 555"
                [class.field__input--error]="hasError('brand')"
              />
              @if (hasError('brand')) {
                <div class="field__error">
                  @if (form.get('brand')?.hasError('required')) { Enter a brand. }
                  @else if (form.get('brand')?.hasError('maxlength')) {
                    Brand must be 60 characters or less.
                  }
                </div>
              }
            </div>
          </div>

          <div class="field">
            <label class="field__label">Unit price (₱)</label>
            <input
              class="field__input"
              type="number"
              step="0.01"
              min="0.01"
              formControlName="unitPrice"
              placeholder="0.00"
              [class.field__input--error]="hasError('unitPrice')"
            />
            @if (hasError('unitPrice')) {
              <div class="field__error">
                @if (form.get('unitPrice')?.hasError('required')) { Enter a price. }
                @else if (form.get('unitPrice')?.hasError('min')) {
                  Enter a price greater than 0.
                }
              </div>
            }
          </div>

          @if (serverError()) {
            <div class="modal__server-error">{{ serverError() }}</div>
          }

          <div class="modal__footer">
            <button
              type="button"
              class="btn btn--outline"
              (click)="close()"
              [disabled]="submitting()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="submitting()"
            >
              {{ submitting() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Save item') }}
            </button>
          </div>

        </form>

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
      width: 100%; max-width: 420px;
      background: var(--color-surface);
      color: var(--color-text);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 24px; text-align: center;
      animation: pop-in .18s ease;
    }
    .modal__icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 52px; height: 52px; margin-bottom: 14px;
      background: var(--color-danger-bg); color: var(--color-danger);
      border-radius: 50%;
    }
    .modal__title { font-size: 17px; font-weight: 600; color: var(--color-text); margin-bottom: 8px; }
    .modal__body {
      font-size: 13px; color: var(--color-text-secondary);
      line-height: 1.55; margin-bottom: 20px;
    }
    .modal__body strong { color: var(--color-text); }
    .modal__footer {
      display: flex; justify-content: center; gap: 8px;
      padding-top: 16px; border-top: 1px solid var(--color-border);
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
  `]
})
export class ItemFormModalComponent implements OnInit {
  @Input() item: Item | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<Item>();

  private readonly fb  = inject(FormBuilder);
  private readonly api = inject(ItemApiService);

  readonly isEdit      = signal(false);
  readonly submitting  = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name:      ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    code:      ['', [Validators.required, Validators.pattern(/^[A-Z]{2}-\d{4}$/)]],
    brand:     ['', [Validators.required, Validators.maxLength(60)]],
    unitPrice: [0,  [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    if (this.item) {
      this.isEdit.set(true);
      this.form.patchValue({
        name:      this.item.name,
        code:      this.item.code,
        brand:     this.item.brand,
        unitPrice: this.item.unitPrice
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.close();
  }

  close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);

    const raw = this.form.getRawValue();
    const payload = {
      name:      raw.name.trim(),
      code:      raw.code.trim().toUpperCase(),
      brand:     raw.brand.trim(),
      unitPrice: Number(raw.unitPrice)
    };

    const req$ = this.isEdit() && this.item
      ? this.api.update(this.item.id, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: saved => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.detail || 'Could not save item.');
      }
    });
  }

  hasError(field: 'name' | 'code' | 'brand' | 'unitPrice'): boolean {
    const c = this.form.get(field);
    return !!c && c.touched && c.invalid;
  }
}
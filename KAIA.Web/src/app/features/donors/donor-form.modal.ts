import {
  Component, EventEmitter, HostListener, Input, OnInit, Output,
  inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DonorApiService } from '../../core/services/donor-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Donor, DonorType } from '../../core/models/donor.model';

@Component({
  selector: 'app-donor-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="modal__header">
          <div>
            <h2 class="modal__title">{{ isEdit() ? 'Edit donor' : 'Add donor' }}</h2>
            <p class="modal__subtitle">
              {{ isEdit() ? 'Update the details below.' : 'Register a new donor.' }}
            </p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="modal__body">

          <div class="field">
            <label class="field__label">Donor type</label>
            <div class="type-toggle">
              <button type="button"
                      class="type-option"
                      [class.type-option--active]="form.get('type')?.value === 'Individual'"
                      (click)="setType('Individual')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Individual
              </button>
              <button type="button"
                      class="type-option"
                      [class.type-option--active]="form.get('type')?.value === 'Organization'"
                      (click)="setType('Organization')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"/>
                  <path d="M15 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"/>
                </svg>
                Organization
              </button>
            </div>
          </div>

          <div class="field">
            <label class="field__label">Name</label>
            <input class="field__input" type="text" formControlName="name"
                   [placeholder]="form.get('type')?.value === 'Organization'
                     ? 'e.g. Bayanihan Corp'
                     : 'e.g. Maria Santos'"
                   [class.field__input--error]="hasError('name')" />
            @if (hasError('name')) {
              <div class="field__error">
                @if (form.get('name')?.hasError('required')) { Enter the donor name. }
                @else if (form.get('name')?.hasError('minlength')) { Name must be at least 2 characters. }
                @else if (form.get('name')?.hasError('maxlength')) { Name must be 120 characters or less. }
              </div>
            }
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field__label">Email</label>
              <input class="field__input" type="email" formControlName="email"
                     placeholder="name@example.com"
                     [class.field__input--error]="hasError('email')" />
              @if (hasError('email')) {
                <div class="field__error">Enter a valid email address.</div>
              }
            </div>

            <div class="field">
              <label class="field__label">Phone</label>
              <input class="field__input" type="tel" formControlName="phone"
                     placeholder="+63 917 555 0100" />
            </div>
          </div>

          @if (serverError()) {
            <div class="modal__server-error">{{ serverError() }}</div>
          }

          <div class="modal__footer">
            <button type="button" class="btn btn--outline" (click)="close()" [disabled]="submitting()">
              Cancel
            </button>
            <button type="submit" class="btn btn--primary" [disabled]="submitting()">
              {{ submitting() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Save donor') }}
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
      width: 100%; max-width: 520px;
      background: var(--color-surface); color: var(--color-text);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column;
      max-height: calc(100vh - 48px);
      animation: pop-in .18s ease;
    }
    .modal__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid var(--color-border);
    }
    .modal__title { font-size: 18px; font-weight: 600; color: var(--color-text); margin: 0; }
    .modal__subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 2px; }
    .modal__body {
      padding: 20px 24px;
      display: flex; flex-direction: column; gap: 16px;
      overflow-y: auto;
    }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field__input--error { border-color: var(--color-danger) !important; }

    .type-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .type-option {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 44px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color .15s, border-color .15s, color .15s;
    }
    .type-option:hover {
      background: var(--color-surface-2);
      color: var(--color-text);
    }
    .type-option--active {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .modal__server-error {
      padding: 10px 12px;
      background: var(--color-danger-bg); color: var(--color-danger);
      font-size: 13px;
      border-radius: var(--radius); border: 1px solid var(--color-danger);
    }
    .modal__footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding-top: 16px; border-top: 1px solid var(--color-border);
      margin-top: 8px;
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop-in {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to   { opacity: 1; transform: none; }
    }
  `]
})
export class DonorFormModalComponent implements OnInit {
  @Input() donor: Donor | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<Donor>();

  private readonly fb  = inject(FormBuilder);
  private readonly api = inject(DonorApiService);

  readonly isEdit      = signal(false);
  readonly submitting  = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    phone: ['', [Validators.maxLength(30)]],
    type:  ['Individual' as DonorType, [Validators.required]]
  });

  ngOnInit(): void {
    if (this.donor) {
      this.isEdit.set(true);
      this.form.patchValue({
        name:  this.donor.name,
        email: this.donor.email ?? '',
        phone: this.donor.phone ?? '',
        type:  this.donor.type
      });
    }
  }

  setType(t: DonorType): void {
    this.form.patchValue({ type: t });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.close(); }

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
      name:  raw.name.trim(),
      email: raw.email.trim() || null,
      phone: raw.phone.trim() || null,
      type:  raw.type
    };

    const req$ = this.isEdit() && this.donor
      ? this.api.update(this.donor.id, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: saved => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.message || 'Could not save donor.');
      }
    });
  }

  hasError(field: 'name' | 'email' | 'phone'): boolean {
    const c = this.form.get(field);
    return !!c && c.touched && c.invalid;
  }
}
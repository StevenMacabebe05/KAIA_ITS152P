import {
  Component, EventEmitter, HostListener, Input, OnInit, Output,
  inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgoApiService } from '../../core/services/ngo-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Ngo } from '../../core/models/ngo.model';

@Component({
  selector: 'app-ngo-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="modal__header">
          <div>
            <h2 class="modal__title">{{ isEdit() ? 'Edit NGO' : 'Add NGO' }}</h2>
            <p class="modal__subtitle">
              {{ isEdit() ? 'Update the details below.' : 'Fill in the details for the new NGO.' }}
            </p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="modal__body">

          <div class="field">
            <label class="field__label">Name</label>
            <input
              class="field__input"
              type="text"
              formControlName="name"
              placeholder="e.g. WWF Philippines"
              [class.field__input--error]="hasError('name')"
            />
            @if (hasError('name')) {
              <div class="field__error">
                @if (form.get('name')?.hasError('required')) { Enter the NGO name. }
                @else if (form.get('name')?.hasError('minlength')) { Name must be at least 2 characters. }
                @else if (form.get('name')?.hasError('maxlength')) { Name must be 120 characters or less. }
              </div>
            }
          </div>

          <div class="field">
            <label class="field__label">Description</label>
            <textarea
              class="field__input field__textarea"
              formControlName="description"
              placeholder="Brief description of the NGO's mission..."
              rows="3"
              [class.field__input--error]="hasError('description')"
            ></textarea>
            @if (hasError('description')) {
              <div class="field__error">Description must be 500 characters or less.</div>
            }
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field__label">Contact email</label>
              <input
                class="field__input"
                type="email"
                formControlName="contactEmail"
                placeholder="info@ngo.org"
                [class.field__input--error]="hasError('contactEmail')"
              />
              @if (hasError('contactEmail')) {
                <div class="field__error">Enter a valid email address.</div>
              }
            </div>

            <div class="field">
              <label class="field__label">Contact phone</label>
              <input
                class="field__input"
                type="tel"
                formControlName="contactPhone"
                placeholder="+63 2 8888 8888"
                [class.field__input--error]="hasError('contactPhone')"
              />
            </div>
          </div>

          <div class="field">
            <label class="field__label">Website</label>
            <input
              class="field__input"
              type="url"
              formControlName="website"
              placeholder="https://ngo.org"
              [class.field__input--error]="hasError('website')"
            />
            @if (hasError('website')) {
              <div class="field__error">Enter a valid URL, including https://.</div>
            }
          </div>

          @if (serverError()) {
            <div class="modal__server-error">{{ serverError() }}</div>
          }

          <div class="modal__footer">
            <button type="button" class="btn btn--outline" (click)="close()" [disabled]="submitting()">
              Cancel
            </button>
            <button type="submit" class="btn btn--primary" [disabled]="submitting()">
              {{ submitting() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Save NGO') }}
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
      width: 100%; max-width: 560px;
      background: var(--color-surface); color: var(--color-text);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column;
      max-height: calc(100vh - 48px);
      animation: pop-in .18s ease;
    }
    .modal__header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--color-border);
    }
    .modal__title { font-size: 18px; font-weight: 600; color: var(--color-text); margin: 0; }
    .modal__subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 2px; }
    .modal__body {
      padding: 20px 24px;
      display: flex; flex-direction: column; gap: 16px;
      overflow-y: auto;
    }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field__textarea {
      height: auto;
      min-height: 80px;
      padding: 10px 12px;
      font-family: inherit;
      resize: vertical;
    }
    .field__input--error { border-color: var(--color-danger) !important; }
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
export class NgoFormModalComponent implements OnInit {
  @Input() ngo: Ngo | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<Ngo>();

  private readonly fb  = inject(FormBuilder);
  private readonly api = inject(NgoApiService);

  readonly isEdit      = signal(false);
  readonly submitting  = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name:         ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description:  ['', [Validators.maxLength(500)]],
    contactEmail: ['', [Validators.email, Validators.maxLength(120)]],
    contactPhone: ['', [Validators.maxLength(30)]],
    website:      ['', [Validators.pattern(/^https?:\/\/.+/i), Validators.maxLength(200)]]
  });

  ngOnInit(): void {
    if (this.ngo) {
      this.isEdit.set(true);
      this.form.patchValue({
        name:         this.ngo.name,
        description:  this.ngo.description ?? '',
        contactEmail: this.ngo.contactEmail ?? '',
        contactPhone: this.ngo.contactPhone ?? '',
        website:      this.ngo.website ?? ''
      });
    }
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
      name:         raw.name.trim(),
      description:  raw.description.trim() || null,
      contactEmail: raw.contactEmail.trim() || null,
      contactPhone: raw.contactPhone.trim() || null,
      website:      raw.website.trim() || null
    };

    const req$ = this.isEdit() && this.ngo
      ? this.api.update(this.ngo.id, payload)
      : this.api.create(payload);

    req$.subscribe({
      next: saved => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.detail || 'Could not save NGO.');
      }
    });
  }

  hasError(field: 'name' | 'description' | 'contactEmail' | 'contactPhone' | 'website'): boolean {
    const c = this.form.get(field);
    return !!c && c.touched && c.invalid;
  }
}
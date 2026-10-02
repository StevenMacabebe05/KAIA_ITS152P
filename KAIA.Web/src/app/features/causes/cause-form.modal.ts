import {
  Component, EventEmitter, HostListener, Input, OnInit, Output,
  inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CauseApiService } from '../../core/services/cause-api.service';
import { NgoApiService } from '../../core/services/ngo-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Cause, CauseStatus, NgoOption } from '../../core/models/cause.model';

@Component({
  selector: 'app-cause-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="modal__header">
          <div>
            <h2 class="modal__title">{{ isEdit() ? 'Edit cause' : 'Add cause' }}</h2>
            <p class="modal__subtitle">
              {{ isEdit() ? 'Update the details below.' : 'Create a new fundraising campaign.' }}
            </p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="modal__body">

          <div class="field">
            <label class="field__label">NGO</label>
            <select class="field__input" formControlName="ngoId"
                    [class.field__input--error]="hasError('ngoId')">
              <option [ngValue]="0" disabled>Select an NGO</option>
              @for (ngo of ngos(); track ngo.id) {
                <option [ngValue]="ngo.id">{{ ngo.name }}</option>
              }
            </select>
            @if (hasError('ngoId')) {
              <div class="field__error">Select an NGO.</div>
            }
          </div>

          <div class="field">
            <label class="field__label">Title</label>
            <input class="field__input" type="text" formControlName="title"
                   placeholder="e.g. Relief Packs for Typhoon Evacuees"
                   [class.field__input--error]="hasError('title')" />
            @if (hasError('title')) {
              <div class="field__error">
                @if (form.get('title')?.hasError('required')) { Enter the cause title. }
                @else if (form.get('title')?.hasError('minlength')) { Title must be at least 3 characters. }
              </div>
            }
          </div>

          <div class="field">
            <label class="field__label">Description</label>
            <textarea class="field__input field__textarea" formControlName="description"
                      placeholder="Brief description of the campaign's purpose..."
                      rows="3"></textarea>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field__label">Goal amount (₱)</label>
              <input class="field__input" type="number" step="0.01" min="0.01"
                     formControlName="goalAmount"
                     [class.field__input--error]="hasError('goalAmount')" />
              @if (hasError('goalAmount')) {
                <div class="field__error">Enter a goal greater than 0.</div>
              }
            </div>

            <div class="field">
              <label class="field__label">Deadline</label>
              <input class="field__input" type="date"
                     formControlName="deadline"
                     [class.field__input--error]="hasError('deadline')" />
              @if (hasError('deadline')) {
                <div class="field__error">Choose a deadline.</div>
              }
            </div>
          </div>

          @if (isEdit()) {
            <div class="field">
              <label class="field__label">Status</label>
              <select class="field__input" formControlName="status">
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          }

          @if (serverError()) {
            <div class="modal__server-error">{{ serverError() }}</div>
          }

          <div class="modal__footer">
            <button type="button" class="btn btn--outline" (click)="close()" [disabled]="submitting()">
              Cancel
            </button>
            <button type="submit" class="btn btn--primary" [disabled]="submitting()">
              {{ submitting() ? 'Saving…' : (isEdit() ? 'Save changes' : 'Save cause') }}
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
export class CauseFormModalComponent implements OnInit {
  @Input() cause: Cause | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<Cause>();

  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(CauseApiService);
  private readonly ngoApi    = inject(NgoApiService);

  readonly isEdit      = signal(false);
  readonly submitting  = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly ngos        = signal<NgoOption[]>([]);

  readonly form = this.fb.nonNullable.group({
    ngoId:       [0, [Validators.required, Validators.min(1)]],
    title:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]],
    goalAmount:  [0, [Validators.required, Validators.min(0.01)]],
    deadline:    ['', [Validators.required]],
    status:      ['Active' as CauseStatus]
  });

  ngOnInit(): void {
    // Load NGOs for the dropdown
    this.ngoApi.getAll().subscribe({
      next: list => this.ngos.set(list.map(n => ({ id: n.id, name: n.name })))
    });

    if (this.cause) {
      this.isEdit.set(true);
      this.form.patchValue({
        ngoId:       this.cause.ngoId,
        title:       this.cause.title,
        description: this.cause.description ?? '',
        goalAmount:  this.cause.goalAmount,
        deadline:    this.cause.deadline.substring(0, 10),  // "yyyy-MM-dd"
        status:      this.cause.status
      });
    } else {
      // Default deadline to 30 days from now for new causes
      const d = new Date();
      d.setDate(d.getDate() + 30);
      this.form.patchValue({ deadline: d.toISOString().substring(0, 10) });
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

    // Convert "yyyy-MM-dd" to ISO 8601 with UTC time
    const deadlineIso = new Date(raw.deadline + 'T23:59:59.000Z').toISOString();

    const basePayload = {
      ngoId:       Number(raw.ngoId),
      title:       raw.title.trim(),
      description: raw.description.trim() || null,
      goalAmount:  Number(raw.goalAmount),
      deadline:    deadlineIso
    };

    const req$ = this.isEdit() && this.cause
      ? this.api.update(this.cause.id, { ...basePayload, status: raw.status as CauseStatus })
      : this.api.create(basePayload);

    req$.subscribe({
      next: saved => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.serverError.set(err.detail || 'Could not save cause.');
      }
    });
  }

  hasError(field: 'ngoId' | 'title' | 'goalAmount' | 'deadline'): boolean {
    const c = this.form.get(field);
    return !!c && c.touched && c.invalid;
  }
}
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cause } from '../../core/models/cause.model';

@Component({
  selector: 'app-cause-delete-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </div>

        <h2 class="modal__title">Delete this cause?</h2>
        <p class="modal__body">
          <strong>{{ cause?.title }}</strong> will be permanently removed.
          Any donations or distributions linked to it will also be affected.
          This action cannot be undone.
        </p>

        <div class="modal__footer">
          <button class="btn btn--outline" (click)="close()">Cancel</button>
          <button class="btn btn--danger" (click)="confirm()">Delete cause</button>
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
      width: 100%; max-width: 420px;
      background: var(--color-surface); color: var(--color-text);
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
    @keyframes pop-in {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to   { opacity: 1; transform: none; }
    }
  `]
})
export class CauseDeleteConfirmModalComponent {
  @Input() cause: Cause | null = null;
  @Output() closed    = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<number>();

  @HostListener('document:keydown.escape')
  onEsc(): void { this.close(); }

  close(): void { this.closed.emit(); }

  confirm(): void {
    if (this.cause) this.confirmed.emit(this.cause.id);
  }
}
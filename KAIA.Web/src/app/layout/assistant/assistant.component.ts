import {
  Component, ElementRef, OnInit, ViewChild, computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemApiService } from '../../core/services/item-api.service';
import { AssistantService } from '../../core/services/assistant.service';
import { Item } from '../../core/models/item.model';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating button -->
    <button class="fab"
            [class.fab--open]="open()"
            (click)="toggleOpen()"
            [attr.aria-label]="open() ? 'Close assistant' : 'Open KAIA assistant'"
            [attr.aria-expanded]="open()">
      @if (open()) {
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      } @else {
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        @if (hasUnreadIntro()) {
          <span class="fab__pulse"></span>
        }
      }
    </button>

    <!-- Chat panel -->
    @if (open()) {
      <div class="chat" role="dialog" aria-label="KAIA Assistant">
        <div class="chat__head">
          <div class="chat__head-left">
            <div class="chat__avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4"/>
                <path d="M12 18v4"/>
                <path d="m4.93 4.93 2.83 2.83"/>
                <path d="m16.24 16.24 2.83 2.83"/>
                <path d="M2 12h4"/>
                <path d="M18 12h4"/>
                <path d="m4.93 19.07 2.83-2.83"/>
                <path d="m16.24 7.76 2.83-2.83"/>
              </svg>
            </div>
            <div>
              <div class="chat__title">KAIA Assistant</div>
              <div class="chat__sub">
                {{ loading() ? 'Loading catalog…' : 'Ask about your donation items' }}
              </div>
            </div>
          </div>
          <button class="chat__close" (click)="close()" aria-label="Close">×</button>
        </div>

        <div class="chat__body" #scrollArea>
          @if (messages().length === 0 && !loading()) {
            <div class="chat__welcome">
              <div class="chat__welcome-emoji">👋</div>
              <div class="chat__welcome-title">Hi! I'm KAIA Assistant.</div>
              <div class="chat__welcome-text">
                I can answer questions about your {{ itemCount() }} donation items.
                Try one of these:
              </div>

              <div class="chat__suggestions">
                @for (s of suggestions; track s) {
                  <button class="chat__suggestion" (click)="sendSuggestion(s)">
                    {{ s }}
                  </button>
                }
              </div>
            </div>
          }

          @for (m of messages(); track m.id) {
            <div class="chat__msg" [class.chat__msg--user]="m.role === 'user'">
              @if (m.role === 'assistant') {
                <div class="chat__msg-avatar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v4"/><path d="M12 18v4"/>
                    <path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/>
                    <path d="M2 12h4"/><path d="M18 12h4"/>
                    <path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/>
                  </svg>
                </div>
              }
              <div class="chat__bubble">
                <div class="chat__text">{{ m.text }}</div>
              </div>
            </div>
          }

          @if (thinking()) {
            <div class="chat__msg">
              <div class="chat__msg-avatar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v4"/><path d="M12 18v4"/>
                  <path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/>
                  <path d="M2 12h4"/><path d="M18 12h4"/>
                  <path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/>
                </svg>
              </div>
              <div class="chat__bubble chat__bubble--typing">
                <span class="chat__dot"></span>
                <span class="chat__dot"></span>
                <span class="chat__dot"></span>
              </div>
            </div>
          }
        </div>

        <form class="chat__form" (submit)="send($event)">
          <input class="chat__input"
                 type="text"
                 placeholder="Ask about items, brands, prices…"
                 [ngModel]="input()"
                 (ngModelChange)="input.set($event)"
                 [disabled]="loading()"
                 name="assistantInput" />
          <button class="chat__send"
                  type="submit"
                  [disabled]="!input().trim() || loading()"
                  aria-label="Send message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    }
  `,
  styles: [`
    /* ═══ Floating action button ═══ */
    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 90;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: var(--color-primary);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(30, 64, 175, 0.35);
      transition: transform .2s ease, background-color .15s ease, box-shadow .2s ease;
    }

    .fab:hover {
      transform: translateY(-2px) scale(1.04);
      background: var(--color-primary-hover);
      box-shadow: 0 12px 32px rgba(30, 64, 175, 0.42);
    }

    .fab--open {
      background: var(--color-surface);
      color: var(--color-text);
      box-shadow: var(--shadow-lg);
    }

    .fab--open:hover { background: var(--color-surface-2); }

    .fab__pulse {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-accent);
      border: 2px solid var(--color-surface);
      animation: fab-pulse 2s ease-in-out infinite;
    }

    @keyframes fab-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.15); opacity: 0.7; }
    }

    /* ═══ Chat panel ═══ */
    .chat {
      position: fixed;
      bottom: 96px;
      right: 24px;
      z-index: 90;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 560px;
      max-height: calc(100vh - 140px);
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.25);
      overflow: hidden;
      animation: chat-in .25s cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes chat-in {
      from { opacity: 0; transform: translateY(12px) scale(.98); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }

    .chat__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%);
      color: #fff;
    }

    .chat__head-left { display: flex; align-items: center; gap: 12px; }

    .chat__avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.22);
    }

    .chat__title { font-size: 14px; font-weight: 700; color: #fff; }
    .chat__sub   { font-size: 11px; color: rgba(255, 255, 255, 0.72); margin-top: 1px; }

    .chat__close {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.85);
      font-size: 20px;
      line-height: 1;
      border-radius: 6px;
      cursor: pointer;
    }

    .chat__close:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }

    .chat__body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: var(--color-page-bg);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .chat__welcome {
      text-align: center;
      padding: 12px 4px;
    }

    .chat__welcome-emoji { font-size: 32px; margin-bottom: 8px; }
    .chat__welcome-title { font-size: 15px; font-weight: 700; color: var(--color-text); margin-bottom: 6px; }

    .chat__welcome-text {
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.5;
      margin-bottom: 14px;
    }

    .chat__suggestions {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .chat__suggestion {
      display: block;
      width: 100%;
      text-align: left;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: background-color .15s, border-color .15s, transform .15s;
    }

    .chat__suggestion:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary);
      transform: translateX(2px);
    }

    /* Messages */
    .chat__msg {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      max-width: 90%;
    }

    .chat__msg--user {
      flex-direction: row-reverse;
      align-self: flex-end;
      margin-left: auto;
    }

    .chat__msg-avatar {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }

    .chat__bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--color-text);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-bottom-left-radius: 4px;
    }

    .chat__msg--user .chat__bubble {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
      border-bottom-left-radius: 14px;
      border-bottom-right-radius: 4px;
    }

    .chat__text { white-space: pre-line; }

    .chat__bubble--typing {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 14px;
    }

    .chat__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-text-muted);
      animation: typing-dot 1.2s ease-in-out infinite;
    }

    .chat__dot:nth-child(2) { animation-delay: .15s; }
    .chat__dot:nth-child(3) { animation-delay: .30s; }

    @keyframes typing-dot {
      0%, 60%, 100% { transform: translateY(0);   opacity: .45; }
      30%           { transform: translateY(-4px); opacity: 1; }
    }

    /* Input bar */
    .chat__form {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .chat__input {
      flex: 1;
      height: 38px;
      padding: 0 14px;
      border: 1px solid var(--color-border-strong);
      border-radius: 20px;
      background: var(--color-surface-2);
      color: var(--color-text);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color .15s, background-color .15s;
    }

    .chat__input:focus {
      border-color: var(--color-primary);
      background: var(--color-surface);
    }

    .chat__send {
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: none;
      background: var(--color-primary);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color .15s, transform .1s;
    }

    .chat__send:hover:not(:disabled)  { background: var(--color-primary-hover); }
    .chat__send:active:not(:disabled) { transform: scale(.94); }
    .chat__send:disabled              { opacity: .5; cursor: not-allowed; }

    @media (max-width: 480px) {
      .chat {
        right: 16px;
        bottom: 88px;
        width: calc(100vw - 32px);
        height: 70vh;
      }
      .fab { bottom: 16px; right: 16px; }
    }
  `]
})
export class AssistantComponent implements OnInit {
  private readonly api = inject(ItemApiService);
  private readonly assistant = inject(AssistantService);

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLDivElement>;

  readonly open      = signal(false);
  readonly input     = signal('');
  readonly messages  = signal<ChatMessage[]>([]);
  readonly thinking  = signal(false);
  readonly loading   = signal(true);
  readonly itemCount = signal(0);
  readonly hasUnreadIntro = signal(true);

  readonly suggestions = this.assistant.getSuggestions();

  private items: Item[] = [];
  private counter = 0;

  ngOnInit(): void {
    this.api.getAll().subscribe({
      next: items => {
        this.items = items;
        this.itemCount.set(items.length);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleOpen(): void {
    this.open.update(v => !v);
    if (this.open()) {
      this.hasUnreadIntro.set(false);
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  close(): void { this.open.set(false); }

  send(event: Event): void {
    event.preventDefault();
    const q = this.input().trim();
    if (!q) return;
    this.input.set('');
    this.pushUser(q);
    this.answer(q);
  }

  sendSuggestion(q: string): void {
    this.pushUser(q);
    this.answer(q);
  }

  private pushUser(text: string): void {
    this.messages.update(list => [
      ...list,
      { id: ++this.counter, role: 'user', text, timestamp: Date.now() }
    ]);
    this.scrollToBottom();
  }

  private answer(q: string): void {
    this.thinking.set(true);
    this.scrollToBottom();

    // Small delay so it feels like the assistant is thinking
    const delay = 250 + Math.min(500, q.length * 8);
    setTimeout(() => {
      const reply = this.assistant.answer(q, this.items);
      this.messages.update(list => [
        ...list,
        { id: ++this.counter, role: 'assistant', text: reply, timestamp: Date.now() }
      ]);
      this.thinking.set(false);
      this.scrollToBottom();
    }, delay);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }
}
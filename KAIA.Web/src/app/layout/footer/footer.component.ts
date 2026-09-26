import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="footer__inner">
        <div class="footer__left">
          <span class="footer__brand">KAIA</span>
          <span class="footer__dot">·</span>
          <span>For Causes That Matter</span>
        </div>
        <div class="footer__right">
          <span>M1 · v0.1</span>
          <span class="footer__dot">·</span>
          <span>ITS152P</span>
          <span class="footer__dot">·</span>
          <span>© {{ year }} Steven Macabebe</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
      margin-top: 40px;
      transition: background-color .2s, border-color .2s;
    }

    .footer__inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 12px;
      color: var(--color-text-muted);
      flex-wrap: wrap;
    }

    .footer__left, .footer__right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .footer__brand {
      font-weight: 800;
      color: var(--color-primary);
      letter-spacing: 0.02em;
    }

    .footer__dot { opacity: 0.5; }
  `]
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
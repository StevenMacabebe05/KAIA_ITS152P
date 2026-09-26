import {
  Component, Input, OnChanges, SimpleChanges, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qr" [style.width.px]="size" [style.height.px]="size">
      @if (svg(); as s) {
        <div class="qr__svg" [innerHTML]="s"></div>
      } @else {
        <div class="qr__placeholder"></div>
      }
    </div>
  `,
    styles: [`
    :host { display: block; }

    .qr {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      transition: border-color .15s, box-shadow .15s;
    }
  `]
})
export class QrCodeComponent implements OnChanges {
  @Input({ required: true }) value!: string;
  @Input() size = 120;

  private readonly sanitizer = inject(DomSanitizer);
  readonly svg = signal<SafeHtml | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['size']) {
      void this.render();
    }
  }

  private async render(): Promise<void> {
    if (!this.value) {
      this.svg.set(null);
      return;
    }
    try {
      const raw = await QRCode.toString(this.value, {
        type: 'svg',
        margin: 1,
        width: this.size,
        errorCorrectionLevel: 'M',
        color: { dark: '#0F172A', light: '#FFFFFF' }
      });
      this.svg.set(this.sanitizer.bypassSecurityTrustHtml(raw));
    } catch (err) {
      console.error('QR code render failed', err);
      this.svg.set(null);
    }
  }
}
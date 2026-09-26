import {
  Directive, ElementRef, Input, OnChanges, OnInit, SimpleChanges
} from '@angular/core';

/**
 * Animates the text content of an element from its current value to a target
 * number using an ease-out cubic curve.
 *
 * Usage:
 *   <span [appCountUp]="totalItems()"></span>
 *   <span [appCountUp]="totalValue()" countPrefix="₱"></span>
 *   <span [appCountUp]="average()" countPrefix="₱" [countDecimals]="2"></span>
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit, OnChanges {
  @Input('appCountUp') target: number = 0;
  @Input() countDuration = 1200;
  @Input() countPrefix = '';
  @Input() countSuffix = '';
  @Input() countDecimals = 0;

  private currentValue = 0;
  private animationFrame: number | null = null;

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.el.nativeElement.textContent = this.format(0);
    this.animate(0, this.target);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['target'] && !changes['target'].firstChange) {
      this.animate(this.currentValue, this.target);
    }
  }

  private animate(from: number, to: number): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (from === to || this.countDuration <= 0) {
      this.currentValue = to;
      this.el.nativeElement.textContent = this.format(to);
      return;
    }

    const startTime = performance.now();
    const duration = this.countDuration;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);   // ease-out cubic
      const value = from + (to - from) * eased;

      this.currentValue = value;
      this.el.nativeElement.textContent = this.format(value);

      if (t < 1) {
        this.animationFrame = requestAnimationFrame(tick);
      } else {
        this.animationFrame = null;
      }
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  private format(v: number): string {
    const fixed = v.toFixed(this.countDecimals);
    const [intPart, decPart] = fixed.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const numberPart = decPart ? `${grouped}.${decPart}` : grouped;
    return this.countPrefix + numberPart + this.countSuffix;
  }
}
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNavComponent } from './layout/top-nav/top-nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopNavComponent],
  template: `
    <app-top-nav></app-top-nav>
    <main>
      <router-outlet></router-outlet>
    </main>
  `
})
export class App {}
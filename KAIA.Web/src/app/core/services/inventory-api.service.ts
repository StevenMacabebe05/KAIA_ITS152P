import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { InventoryItem } from '../models/inventory.model';
import { ApiError } from './item-api.service';

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/inventory`;

  getAll(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(this.base).pipe(catchError(this.handle));
  }

  getByItemId(itemId: number): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.base}/${itemId}`).pipe(catchError(this.handle));
  }

  private handle = (err: HttpErrorResponse) => {
    let body: any = err.error;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }

    const apiErr = new ApiError(
      err.status,
      body?.title ?? 'Request failed',
      body?.detail ?? err.statusText ?? 'Could not load inventory data.'
    );
    return throwError(() => apiErr);
  };
}
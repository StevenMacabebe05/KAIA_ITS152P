import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Item, CreateItem, UpdateItem } from '../models/item.model';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
    public readonly fieldErrors: Record<string, string[]> = {}
  ) {
    super(detail || title);
  }
}

@Injectable({ providedIn: 'root' })
export class ItemApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/items`;

  getAll(): Observable<Item[]> {
    return this.http.get<Item[]>(this.base).pipe(catchError(this.handle));
  }

  getById(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.base}/${id}`).pipe(catchError(this.handle));
  }

  create(payload: CreateItem): Observable<Item> {
    return this.http.post<Item>(this.base, payload).pipe(catchError(this.handle));
  }

  update(id: number, payload: UpdateItem): Observable<Item> {
    return this.http.put<Item>(`${this.base}/${id}`, payload).pipe(catchError(this.handle));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(catchError(this.handle));
  }

  private handle = (err: HttpErrorResponse) => {
    let apiErr: ApiError;

    // Angular leaves `err.error` as a string when Content-Type is
    // application/problem+json. Try parsing it back into an object.
    let body: any = err.error;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }

    if (body && typeof body === 'object') {
      if (body.errors && typeof body.errors === 'object') {
        const firstField = Object.keys(body.errors)[0];
        apiErr = new ApiError(
          err.status,
          body.title ?? 'Validation failed',
          body.errors[firstField]?.[0] ?? 'Please check the form.',
          body.errors
        );
      } else {
        apiErr = new ApiError(
          err.status,
          body.title ?? `HTTP ${err.status}`,
          body.detail ?? body.title ?? err.statusText ?? `Request failed (${err.status}).`
        );
      }
    } else if (err.status === 0) {
      apiErr = new ApiError(
        0,
        'Connection failed',
        'Could not reach the KAIA API. Is it running on http://localhost:5217?'
      );
    } else {
      apiErr = new ApiError(
        err.status,
        `HTTP ${err.status}`,
        err.statusText || `Request failed (${err.status}).`
      );
    }

    return throwError(() => apiErr);
  }

}
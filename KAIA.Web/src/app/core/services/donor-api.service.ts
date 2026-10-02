import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Donor, CreateDonor, UpdateDonor } from '../models/donor.model';
import { ApiError } from './item-api.service';

@Injectable({ providedIn: 'root' })
export class DonorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/donors`;

  getAll(type?: string): Observable<Donor[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<Donor[]>(this.base, { params }).pipe(catchError(this.handle));
  }

  getById(id: number): Observable<Donor> {
    return this.http.get<Donor>(`${this.base}/${id}`).pipe(catchError(this.handle));
  }

  create(payload: CreateDonor): Observable<Donor> {
    return this.http.post<Donor>(this.base, payload).pipe(catchError(this.handle));
  }

  update(id: number, payload: UpdateDonor): Observable<Donor> {
    return this.http.put<Donor>(`${this.base}/${id}`, payload).pipe(catchError(this.handle));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(catchError(this.handle));
  }

  private handle = (err: HttpErrorResponse) => {
    let body: any = err.error;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }

    let apiErr: ApiError;

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
        const friendly =
          (body.detail && String(body.detail).trim()) ||
          (body.title && String(body.title).trim() ? body.title : '') ||
          err.statusText ||
          `Request failed (${err.status}).`;

        apiErr = new ApiError(err.status, body.title ?? `HTTP ${err.status}`, friendly);
      }
    } else if (err.status === 0) {
      apiErr = new ApiError(0, 'Connection failed',
        'Could not reach the KAIA API. Is it running on http://localhost:5217?');
    } else {
      apiErr = new ApiError(err.status, `HTTP ${err.status}`,
        err.statusText || `Request failed (${err.status}).`);
    }

    return throwError(() => apiErr);
  };
}
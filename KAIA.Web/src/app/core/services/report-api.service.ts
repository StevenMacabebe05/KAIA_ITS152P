import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiError } from './item-api.service';
import {
  DonationReport,
  InventoryReport,
  DistributionReport,
  CauseProgress
} from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/reports`;

  donations(): Observable<DonationReport> {
    return this.http.get<DonationReport>(`${this.base}/donations`).pipe(catchError(this.handle));
  }

  inventory(): Observable<InventoryReport> {
    return this.http.get<InventoryReport>(`${this.base}/inventory`).pipe(catchError(this.handle));
  }

  distributions(): Observable<DistributionReport> {
    return this.http.get<DistributionReport>(`${this.base}/distributions`).pipe(catchError(this.handle));
  }

  causes(): Observable<CauseProgress[]> {
    return this.http.get<CauseProgress[]>(`${this.base}/causes`).pipe(catchError(this.handle));
  }

  private handle = (err: HttpErrorResponse) => {
    let body: any = err.error;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }

    let apiErr: ApiError;

    if (body && typeof body === 'object') {
      const friendly =
        (body.detail && String(body.detail).trim()) ||
        (body.title && String(body.title).trim() ? body.title : '') ||
        err.statusText ||
        `Request failed (${err.status}).`;
      apiErr = new ApiError(err.status, body.title ?? `HTTP ${err.status}`, friendly);
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
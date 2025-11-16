// stepover.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StepOverService {
private baseUrl = `${environment.apiBaseUrl}/stopover`;

  constructor(private http: HttpClient) {}

  getStepOvers(isActive?: boolean, page: number = 1, pageSize: number = 10): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<any>(this.baseUrl, { params });
  }

  getStepOver(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  createStepOver(request: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, request);
  }

  updateStepOver(id: number, request: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, request);
  }

  deleteStepOver(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  searchNearby(latitude: number, longitude: number, radiusKm: number = 5): Observable<any> {
    const params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString())
      .set('radiusKm', radiusKm.toString());

    return this.http.get<any>(`${this.baseUrl}/search/nearby`, { params });
  }

  addTenantsToStepOver(stepOverId: number, tenantIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${stepOverId}/tenants`, tenantIds);
  }
}

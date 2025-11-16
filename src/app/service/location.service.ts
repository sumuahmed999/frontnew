// services/location.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocationListResponse, CreateLocationRequest, UpdateLocationRequest, LocationMaster } from '../core/models/location.models';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getLocations(
    searchTerm: string = '',
    isActive?: boolean,
    pageNumber: number = 1,
    pageSize: number = 10,
    sortColumn: string = 'LocationName',
    sortDirection: string = 'ASC'
  ): Observable<LocationListResponse> {
    const headers = this.authService.getAuthHeaders();
    
    let params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString())
      .set('sortColumn', sortColumn)
      .set('sortDirection', sortDirection);

    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<LocationListResponse>(`${this.baseUrl}/Master/locations`, { headers, params });
  }

  getLocation(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/Master/locations/${id}`, { headers });
  }

  createLocation(request: CreateLocationRequest): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.baseUrl}/Master/locations`, request, { headers });
  }

  updateLocation(id: number, request: UpdateLocationRequest): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/Master/locations/${id}`, request, { headers });
  }

  deleteLocation(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.baseUrl}/Master/locations/${id}`, { headers });
  }
}

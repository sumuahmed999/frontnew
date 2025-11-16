// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BookingRequest, BookingResponse, LocationModel, RouteSearchResponse } from '../core/models/location-search.models';
import { ApiResponse } from './route.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:5000/api'; // Fixed base URL

  constructor(private http: HttpClient) {}

  // Get start locations
  getStartLocations(): Observable<LocationModel[]> {
    return this.http.get<LocationModel[]>(`${this.baseUrl}/search/start-locations`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get end locations for a specific start location
  getEndLocations(startLocationId: number): Observable<LocationModel[]> {
    return this.http.get<LocationModel[]>(`${this.baseUrl}/search/end-locations/${startLocationId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Search routes
  searchRoutes(
    startLocationId: number, 
    endLocationId: number, 
    departureDate?: string,
    page: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponse<RouteSearchResponse[]>> {
    let params = new HttpParams()
      .set('startLocationId', startLocationId.toString())
      .set('endLocationId', endLocationId.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (departureDate) {
      params = params.set('departureDate', departureDate);
    }

    return this.http.get<ApiResponse<RouteSearchResponse[]>>(`${this.baseUrl}/search/routes`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Create booking
  createBooking(bookingData: BookingRequest): Observable<ApiResponse<BookingResponse>> {
    return this.http.post<ApiResponse<BookingResponse>>(`${this.baseUrl}/search/booking`, bookingData)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => new Error(error?.error?.message || 'An error occurred while processing your request'));
  }
}

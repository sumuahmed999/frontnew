import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StepOverDto {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
  distance: number; // Distance from previous point (km)
  time: number; // Time from previous point (minutes)
}

export interface RouteRequest {
    routeName: string;
    startLocation: {
        id: number;
        name: string;
    };
    endLocation: {
        id: number;
        name: string;
    };
    distance: number;
    estimatedTime: string;
    isActive: boolean;
    stepOvers: StepOverDto[];
}

export interface RouteResponse {
    routeId: number;
    routeName: string;
    startLocation: {
        id: number;
        name: string;
    };
    endLocation: {
        id: number;
        name: string;
    };
    distanceKm: number;
    estimatedTime: string;
    isActive: boolean;
    createdDate: string;
    stepOvers: Array<{
        id: number;
        name: string;
    }>;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
    totalCount?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
}

@Injectable({
    providedIn: 'root'
})
export class RouteService {
    private baseUrl = environment.apiUrl;
    private apiUrl = `${environment.apiBaseUrl}/routes`;

    constructor(private http: HttpClient) { }

    // Get all routes with pagination and filtering
    getRoutes(
        isActive?: boolean,
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string,
        stepOverId?: number
    ): Observable<ApiResponse<RouteResponse[]>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());

        if (isActive !== undefined) {
            params = params.set('isActive', isActive.toString());
        }

        if (searchTerm) {
            params = params.set('searchTerm', searchTerm);
        }

        if (stepOverId) {
            params = params.set('stepOverId', stepOverId.toString());
        }

        return this.http.get<ApiResponse<RouteResponse[]>>(this.apiUrl, { params });
    }

    // Get route by ID
    getRoute(id: number): Observable<ApiResponse<RouteResponse>> {
        return this.http.get<ApiResponse<RouteResponse>>(`${this.apiUrl}/${id}`);
    }

    // Create new route
    createRoute(route: RouteRequest): Observable<ApiResponse<RouteResponse>> {
        return this.http.post<ApiResponse<RouteResponse>>(this.apiUrl, route);
    }

    // Update existing route
    updateRoute(id: number, route: RouteRequest): Observable<ApiResponse<RouteResponse>> {
        return this.http.put<ApiResponse<RouteResponse>>(`${this.apiUrl}/${id}`, route);
    }

    // Delete route
    deleteRoute(id: number): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
    }

    // Search routes by step over
    getRoutesByStepOver(stepOverId: number): Observable<ApiResponse<RouteResponse[]>> {
        return this.http.get<ApiResponse<RouteResponse[]>>(`${this.apiUrl}/search/stepover/${stepOverId}`);
    }
}

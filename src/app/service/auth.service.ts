import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantMaster } from '../core/models/tenant_master';
import {
  TenantDto,
  ApiResponse,
  Tenant,
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  TenantUpdateRequest,
  TenantSelectResponse,
  JwtPayload,
  UpdateTenantRequest,
  UpdateTenantResponse,
  TenantMaster as TenantM
} from '../core/models/auth.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  public getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getTenants(isActive: boolean = true): Observable<Tenant[]> {
    return this.http.get<ApiResponse<TenantDto[]>>(`${this.baseUrl}/Tenant/active?isActive=${isActive}`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data.map(tenant => ({
              code: tenant.tenantCode,
              name: tenant.tenantName
            }));
          }
          return [];
        })
      );
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/Login/login`, request);
  }

  changePassword(userId: number, request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<ChangePasswordResponse>(
      `${this.baseUrl}/Login/${userId}/change-password`,
      request,
      { headers }
    );
  }

  getCurrentUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload: JwtPayload = JSON.parse(atob(token.split('.')[1]));
      return parseInt(payload.nameid || payload.sub || payload.NameIdentifier || '0');
    } catch {
      return null;
    }
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  saveToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }
  saveTenant(tenant: string): void {
    localStorage.setItem('tenant', tenant);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getTenantId(): number | null {
    return Number(localStorage.getItem('tenant'));
  }
  clearToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('tenant');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload: JwtPayload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  getCurrentTenant(): Observable<TenantMaster | null> {
    const headers = this.getAuthHeaders();
    return this.http.get<TenantSelectResponse>(`${this.baseUrl}/Tenant/Select`, { headers })
      .pipe(
        map(response => response.success ? response.data : null)
      );
  }

  getCurrentTenantForUpdate(): Observable<TenantM | null> {
    const headers = this.getAuthHeaders();
    return this.http.get<TenantSelectResponse>(`${this.baseUrl}/Tenant/Select`, { headers })
      .pipe(
        map(response => response.success ? response.data : null)
      );
  }

  getTakeOrdersStatus(): Observable<boolean> {
    return this.getCurrentTenant().pipe(
      map(tenant => tenant?.takeOrders || false)
    );
  }

  updateTakeOrdersStatus(takeOrders: boolean): Observable<any> {
    const headers = this.getAuthHeaders();
    const request: TenantUpdateRequest = { takeOrders };
    return this.http.put(`${this.baseUrl}/Tenant/takeorders`, request, { headers });
  }

  updateTenantInfo(request: UpdateTenantRequest): Observable<UpdateTenantResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<UpdateTenantResponse>(`${this.baseUrl}/Tenant/Update`, request, { headers });
  }
  getTenantLogo(): Observable<string> {
    const headers = this.getAuthHeaders();

    return this.http.get<any>(`${this.baseUrl}/Tenant/logo-url`, { headers }).pipe(
      map(response => {
        if (response && response.logoUrl) {
          return `${this.apiUrl}${response.logoUrl}`;
        }
        return ''; // return empty string if no logo
      })
    );
  }

}

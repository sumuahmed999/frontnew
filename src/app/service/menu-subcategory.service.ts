import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
 
import { ApiResponse } from './menu-category.service';
import { environment } from '../../environments/environment';

export interface MenuSubcategoryRequest {
  categoryId: number;
  subcategoryName: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuSubcategoryResponse {
  subcategoryId: number;
  categoryId: number;
  categoryName: string;
  subcategoryName: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdDate: string;
  itemCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MenuSubcategoryService {
    private apiUrl = `${environment.apiBaseUrl}/MenuSubcategory`;

  constructor(private http: HttpClient) {}

   private getAuthHeaders(): HttpHeaders {
        const token = this.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    private getToken(): string | null {
        return localStorage.getItem('auth_token');
    }


  getSubcategories(
    categoryId?: number,
    isActive?: boolean,
    page: number = 1,
    pageSize: number = 10,
    searchTerm?: string
  ): Observable<ApiResponse<MenuSubcategoryResponse[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (categoryId !== undefined) {
      params = params.set('categoryId', categoryId.toString());
    }

    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    return this.http.get<ApiResponse<MenuSubcategoryResponse[]>>(this.apiUrl, {
       headers: this.getAuthHeaders(),
      params });
  }

  getSubcategory(id: number): Observable<ApiResponse<MenuSubcategoryResponse>> {
    return this.http.get<ApiResponse<MenuSubcategoryResponse>>(`${this.apiUrl}/${id}`,{
       headers: this.getAuthHeaders()
    });
  }

  createSubcategory(subcategory: MenuSubcategoryRequest): Observable<ApiResponse<MenuSubcategoryResponse>> {
    return this.http.post<ApiResponse<MenuSubcategoryResponse>>(this.apiUrl, subcategory,{ headers: this.getAuthHeaders(),});
  }

  updateSubcategory(id: number, subcategory: MenuSubcategoryRequest): Observable<ApiResponse<MenuSubcategoryResponse>> {
    return this.http.put<ApiResponse<MenuSubcategoryResponse>>(`${this.apiUrl}/${id}`, subcategory,{ headers: this.getAuthHeaders(),});
  }

  deleteSubcategory(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`,{ headers: this.getAuthHeaders(),});
  }
}

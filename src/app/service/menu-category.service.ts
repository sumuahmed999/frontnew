import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MenuCategoryRequest {
    categoryName: string;
    description?: string;
    displayOrder: number;
    isActive: boolean;
}

export interface MenuCategoryResponse {
    categoryId: number;
    categoryName: string;
    description?: string;
    displayOrder: number;
    isActive: boolean;
    createdDate: string;
    subcategoryCount: number;
    itemCount: number;
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
export class MenuCategoryService {
    private apiUrl = `${environment.apiBaseUrl}/MenuCategory`;

    constructor(private http: HttpClient) { }

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

    getCategories(
        isActive?: boolean,
        page: number = 1,
        pageSize: number = 10,
        searchTerm?: string
    ): Observable<ApiResponse<MenuCategoryResponse[]>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());

        if (isActive !== undefined) {
            params = params.set('isActive', isActive.toString());
        }

        if (searchTerm) {
            params = params.set('searchTerm', searchTerm);
        }

        return this.http.get<ApiResponse<MenuCategoryResponse[]>>(this.apiUrl, {
            headers: this.getAuthHeaders(),
            params
        });
    }

    getCategory(id: number): Observable<ApiResponse<MenuCategoryResponse>> {
        return this.http.get<ApiResponse<MenuCategoryResponse>>(`${this.apiUrl}/${id}`, {
            headers: this.getAuthHeaders()
        });
    }

    createCategory(category: MenuCategoryRequest): Observable<ApiResponse<MenuCategoryResponse>> {
        return this.http.post<ApiResponse<MenuCategoryResponse>>(this.apiUrl, category, {
            headers: this.getAuthHeaders()
        });
    }

    updateCategory(id: number, category: MenuCategoryRequest): Observable<ApiResponse<MenuCategoryResponse>> {
        return this.http.put<ApiResponse<MenuCategoryResponse>>(`${this.apiUrl}/${id}`, category, {
            headers: this.getAuthHeaders()
        });
    }

    deleteCategory(id: number): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`, {
            headers: this.getAuthHeaders()
        });
    }
}

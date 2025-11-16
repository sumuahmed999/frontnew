import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './menu-category.service';
import { environment } from '../../environments/environment';

export interface MenuItemRequest {
  categoryId: number;
  subcategoryId?: number;
  itemName: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  discountPercentage: number;
  isPromotion: boolean;
  promotionLabel?: string;
  ingredients?: string;
  allergenInfo?: string;
  nutritionalInfo?: { [key: string]: any };
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  spiceLevel: number;
  preparationTime: number;
  availabilityStatus: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItemResponse {
  itemId: number;
  categoryId: number;
  categoryName: string;
  subcategoryId?: number;
  subcategoryName?: string;
  itemName: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  discountPercentage: number;
  isPromotion: boolean;
  promotionLabel?: string;
  images: string[];
  ingredients?: string;
  allergenInfo?: string;
  nutritionalInfo?: { [key: string]: any };
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  spiceLevel: number;
  preparationTime: number;
  availabilityStatus: string;
  displayOrder: number;
  isActive: boolean;
  createdDate: string;
  effectivePrice: number;
  hasDiscount: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MenuItemService {
  public baseUrl = environment.apiUrl;
  public apiUrl = `${environment.apiBaseUrl}/MenuItem`;

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // ❌ Don't set Content-Type manually when using FormData
    });
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  constructor(private http: HttpClient) {}

  getMenuItems(
    categoryId?: number,
    subcategoryId?: number,
    isActive?: boolean,
    isPromotion?: boolean,
    availabilityStatus?: string,
    page: number = 1,
    pageSize: number = 10,
    searchTerm?: string
  ): Observable<ApiResponse<MenuItemResponse[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (categoryId !== undefined) params = params.set('categoryId', categoryId.toString());
    if (subcategoryId !== undefined) params = params.set('subcategoryId', subcategoryId.toString());
    if (isActive !== undefined) params = params.set('isActive', isActive.toString());
    if (isPromotion !== undefined) params = params.set('isPromotion', isPromotion.toString());
    if (availabilityStatus) params = params.set('availabilityStatus', availabilityStatus);
    if (searchTerm) params = params.set('searchTerm', searchTerm);

    return this.http.get<ApiResponse<MenuItemResponse[]>>(this.apiUrl, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  getMenuItem(id: number): Observable<ApiResponse<MenuItemResponse>> {
    return this.http.get<ApiResponse<MenuItemResponse>>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  createMenuItem(menuItem: MenuItemRequest, images?: FileList): Observable<ApiResponse<MenuItemResponse>> {
    const formData = new FormData();

    Object.keys(menuItem).forEach(key => {
      const value = (menuItem as any)[key];
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    if (images) {
      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }
    }

    return this.http.post<ApiResponse<MenuItemResponse>>(this.apiUrl, formData, {
      headers: this.getAuthHeaders()
    });
  }

  updateMenuItem(id: number, menuItem: MenuItemRequest, images?: FileList): Observable<ApiResponse<MenuItemResponse>> {
    const formData = new FormData();

    Object.keys(menuItem).forEach(key => {
      const value = (menuItem as any)[key];
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    if (images) {
      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }
    }

    return this.http.put<ApiResponse<MenuItemResponse>>(`${this.apiUrl}/${id}`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  deleteMenuItem(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}

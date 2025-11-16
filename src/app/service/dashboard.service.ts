// services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  todaysOrders: number;
  yesterdaysOrders: number;
  pendingBookings: number;
  preparingBookings: number;
  readyToDeliverBookings: number;
  completedBookings: number;
  canceledBookings: number;
  todaysRevenue: number;
  yesterdaysRevenue: number;
  totalRevenue: number;
  activeRestaurants: number;
  totalPassengers: number;
}

export interface BookingItem {
  itemName: string;
  quantity: number;
  price: number;
}

export interface RecentBooking {
  bookingId: string;
  bookNumber: string;
  passengerName: string;
  passengerPhone: string;
  busNumber: string;
  busName: string;
  startLocationName: string;
  endLocationName: string;
  departureDateTime: string;
  bookingStatus: string;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  deliveryFee?: number;
  paymentStatus: string;
  createdAt: string;
  orderConfirmedAt?: string;
  preparingStartedAt?: string;
  readyAt?: string;
  completedAt?: string;
  items: BookingItem[];
  timeSinceCreated: string;
}

export interface PagedResult<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiBaseUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Get dashboard statistics
   */
  getDashboardStats(tenantId: number): Observable<DashboardStats> {
    const params = new HttpParams().set('tenantId', tenantId.toString());
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`, { params });
  }

  /**
   * Get paginated bookings
   */
  getBookings(
    tenantId: number,
    pageNumber: number = 1,
    pageSize: number = 10,
    status?: string
  ): Observable<PagedResult<RecentBooking>> {
    let params = new HttpParams()
      .set('tenantId', tenantId.toString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<PagedResult<RecentBooking>>(`${this.apiUrl}/bookings`, { params });
  }

  /**
   * Get latest bookings for dashboard preview
   */
  getLatestBookings(tenantId: number, limit: number = 5): Observable<RecentBooking[]> {
    const params = new HttpParams()
      .set('tenantId', tenantId.toString())
      .set('limit', limit.toString());
    
    return this.http.get<RecentBooking[]>(`${this.apiUrl}/recent`, { params });
  }

  /**
   * Get filtered and paginated orders
   */
  getOrders(filters: OrdersFilterParams): Observable<OrdersResponse> {
    let params = new HttpParams()
      .set('tenantId', filters.tenantId.toString())
      .set('pageNumber', (filters.pageNumber || 1).toString())
      .set('pageSize', (filters.pageSize || 20).toString())
      .set('sortBy', filters.sortBy || 'CreatedAt')
      .set('sortOrder', filters.sortOrder || 'desc');

    if (filters.status && filters.status !== 'all') {
      params = params.set('status', filters.status);
    }
    if (filters.dateFrom) {
      params = params.set('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params = params.set('dateTo', filters.dateTo);
    }
    if (filters.busNumber) {
      params = params.set('busNumber', filters.busNumber);
    }
    if (filters.busName) {
      params = params.set('busName', filters.busName);
    }
    if (filters.passengerPhone) {
      params = params.set('passengerPhone', filters.passengerPhone);
    }
    if (filters.passengerName) {
      params = params.set('passengerName', filters.passengerName);
    }

    return this.http.get<OrdersResponse>(`${this.apiUrl}/orders`, { params });
  }

  /**
   * Get distinct users with their booking statistics
   */
  getUsers(filters: UsersFilterParams): Observable<UsersResponse> {
    let params = new HttpParams()
      .set('tenantId', filters.tenantId.toString())
      .set('pageNumber', (filters.pageNumber || 1).toString())
      .set('pageSize', (filters.pageSize || 20).toString())
      .set('sortBy', filters.sortBy || 'TotalBookings')
      .set('sortOrder', filters.sortOrder || 'desc');

    if (filters.searchQuery) {
      params = params.set('searchQuery', filters.searchQuery);
    }

    return this.http.get<UsersResponse>(`${this.apiUrl}/users/distinct`, { params });
  }
}


// New interfaces for paginated orders API
export interface OrdersFilterParams {
  tenantId: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  busNumber?: string;
  busName?: string;
  passengerPhone?: string;
  passengerName?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BookingItemDetail {
  itemId: number;
  itemName: string;
  categoryId: number;
  categoryName: string;
  subcategoryId: number;
  subcategoryName: string;
  price: number;
  discountedPrice: number | null;
  quantity: number;
  specialInstructions: string | null;
  addedAt: string;
  updatedAt: string;
  canceledAt: string | null;
  cancellationReason: string | null;
  status: string;
}

export interface OrderDetail {
  bookingId: string;
  bookNumber: string;
  busNumber: string;
  busName: string;
  startLocationName: string;
  endLocationName: string;
  departureDate: string;
  departureTime: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  bookingStatus: string;
  totalAmount: number;
  originalAmount: number;
  discountAmount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  deliveryFee: number;
  paymentStatus: string;
  promoCode: string | null;
  createdAt: string;
  updatedAt: string;
  orderConfirmedAt: string | null;
  preparingStartedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  rejectedAt: string | null;
  cancelReason: string | null;
  rejectReason: string | null;
  additionalRemarks: string | null;
  pickupLocationAddress: string;
  pickupLocationLatitude: number;
  pickupLocationLongitude: number;
  bookingItems: BookingItemDetail[];
  canceledItems: BookingItemDetail[];
}

export interface StatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  completed: number;
  canceled: number;
  rejected: number;
}

export interface OrdersResponse {
  items: OrderDetail[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  statusCounts: StatusCounts;
}


// Users API interfaces
export interface UserDetail {
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  canceledBookings: number;
  totalAmountSpent: number;
  firstBookingDate: string;
  lastBookingDate: string;
  lastBookingId: string;
  lastBookingNumber: string;
  lastBusNumber: string;
  lastBusName: string;
  bookingStatuses: any[];
}

export interface UsersResponse {
  items: UserDetail[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  statusCounts: any;
}

export interface UsersFilterParams {
  tenantId: number;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
}

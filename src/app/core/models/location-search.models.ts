// src/app/core/models/location.models.ts
export interface LocationModel {
  id: number;
  name: string;
  code?: string;
  state?: string;
  city?: string;
  country?: string;
  type: 'city' | 'station' | 'airport'; // Include all possible values
}

export interface StartLocationDto {
  startLocationId: number;
  startLocationName: string;
  state?: string;
  city?: string;
  country?: string;
}

export interface EndLocationDto {
  endLocationId: number;
  endLocationName: string;
  state?: string;
  city?: string;
  country?: string;
}

export interface RouteSearchResponse {
  routeId: number;
  routeName: string;
  startLocation: { id: number; name: string; };
  endLocation: { id: number; name: string; };
  distanceKm: number;
  estimatedTime: string;
  isActive: boolean;
  createdDate: string;
  stepOvers: StepOverDetail[];
}

export interface StepOverDetail {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distance: number;
  time: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  errors?: string[];
}

export interface BookingRequest {
  busNumber: string;
  busName: string;
  startLocationId: number;
  startLocationName: string;
  endLocationId: number;
  endLocationName: string;
  departureDate: string;
  departureTime: string;
  tenantId: number;
}

export interface BookingResponse {
  bookingId: number;
  busNumber: string;
  busName: string;
  startLocation: { id: number; name: string; };
  endLocation: { id: number; name: string; };
  departureDate: string;
  departureTime: string;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount?: number;
  createdAt: string;
}

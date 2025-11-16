// models/location.models.ts
export interface LocationMaster {
  locationId: number;
  locationName: string;
  locationPrefix: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationRequest {
  locationName: string;
  locationPrefix: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface UpdateLocationRequest extends CreateLocationRequest {
  locationId: number;
}

export interface LocationListResponse {
  success: boolean;
  message: string;
  data: LocationMaster[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PlaceResult {
  formatted_address: string;
  geometry: {
    location: {
      lat(): number;
      lng(): number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}
export interface LocationModel {
  id: number;
  name: string;
  code: string;
  state: string;
  type: 'city' | 'station' | 'airport';
}

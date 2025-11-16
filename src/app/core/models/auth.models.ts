// auth.models.ts

export interface TenantDto {
  tenantId: number;
  tenantName: string;
  tenantCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  brandColor?: string;
  businessType: string;
  subscriptionPlan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  count: number;
  data: T;
}

export interface Tenant {
  code: string;
  name: string;
}

export interface LoginRequest {
  tenantCode: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface TenantUpdateRequest {
  takeOrders: boolean;
}

export interface TenantSelectResponse {
  success: boolean;
  data: any; // You can replace 'any' with your TenantMaster type
}

// JWT Token payload interface for better type safety
export interface JwtPayload {
  nameid?: string;
  sub?: string;
  NameIdentifier?: string;
  exp: number;
  iat?: number;
}

// Add this to your existing auth.models.ts

// Add these interfaces to your existing auth.models.ts

export interface UpdateTenantRequest {
  tenantName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactMobile?: string;
  alternatePhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  licenseNumber?: string;
  brandColor?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  notes?: string;
  logoBase64?: string; // Add logo support
}

export interface TenantMaster {
  tenantId: number;
  tenantName: string;
  tenantCode: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactMobile?: string;
  alternatePhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  logoBase64?: string; // Add for display
  brandColor?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  licenseNumber?: string;
  subscriptionPlan?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  currency?: string;
  language?: string;
  notes?: string;
  takeOrders: boolean;
}

export interface UpdateTenantResponse {
  success: boolean;
  message: string;
  data?: TenantMaster;
}

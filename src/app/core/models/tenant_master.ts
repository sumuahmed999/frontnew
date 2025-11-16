export interface TenantMaster {
  tenantId: number;
  tenantName?: string;
  tenantCode?: string;
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
  logo?: string; // Base64 string for byte[] from API
  logoUrl?: string;
  favicon?: string; // Base64 string for byte[] from API
  brandColor?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  licenseNumber?: string;
  subscriptionPlan?: string;
  licenseKey?: string;
  maxUsers?: number;
  maxStorageGb?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  billingCycle?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  currency?: string;
  language?: string;
  featuresEnabled?: string; // JSON string
  customSettings?: string; // JSON string
  apiAccessEnabled: boolean;
  apiKey?: string;
  notes?: string;
  isActive: boolean;
  isVerified: boolean;
  verificationDate?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
  takeOrders: boolean;
}
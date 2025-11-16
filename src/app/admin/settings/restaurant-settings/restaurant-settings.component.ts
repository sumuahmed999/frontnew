import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../service/auth.service';
import { TenantMaster, UpdateTenantRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-restaurant-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './restaurant-settings.component.html',
  styleUrl: './restaurant-settings.component.scss'
})
export class RestaurantSettingsComponent implements OnInit {
  restaurantForm!: FormGroup;
  isLoading = false;
  isLoadingData = false;
  successMessage = '';
  errorMessage = '';

  // Logo handling
  logoPreview: string | null = null;
  logoFile: File | null = null;
  maxLogoSize = 5 * 1024 * 1024; // 5MB

  constructor(private fb: FormBuilder, private authService: AuthService) { }

  ngOnInit() {
    this.initializeForm();
    this.loadTenantData();
    this.loadLogo();
  }

  loadLogo() {
    this.authService.getTenantLogo().subscribe({
      next: (response) => {
        this.logoPreview = response; 
      }
    });
  }

  initializeForm() {
    this.restaurantForm = this.fb.group({
      // Basic Info
      tenantName: ['', [Validators.required, Validators.maxLength(100)]],
      businessType: ['', Validators.maxLength(50)],
      subscriptionPlan: ['', Validators.maxLength(50)],

      // Contact Info
      contactName: ['', Validators.maxLength(100)],
      contactEmail: ['', [Validators.email, Validators.maxLength(100)]],
      contactPhone: ['', Validators.maxLength(20)],
      contactMobile: ['', Validators.maxLength(20)],
      alternatePhone: ['', Validators.maxLength(20)],
      website: ['', Validators.maxLength(200)],

      // Address Info
      address: ['', Validators.maxLength(500)],
      city: ['', Validators.maxLength(100)],
      state: ['', Validators.maxLength(100)],
      postalCode: ['', Validators.maxLength(20)],
      country: ['', Validators.maxLength(100)],
      latitude: [null],
      longitude: [null],

      // Business Info
      registrationNumber: ['', Validators.maxLength(100)],
      taxId: ['', Validators.maxLength(100)],
      licenseNumber: ['', Validators.maxLength(100)],

      // Subscription Details
      maxUsers: [null, Validators.min(1)],
      maxStorageGb: [null, Validators.min(1)],
      billingCycle: [''],
      subscriptionStartDate: [''],
      subscriptionEndDate: [''],
      licenseKey: ['', Validators.maxLength(200)],

      // Preferences
      timezone: ['', Validators.maxLength(50)],
      currency: ['', Validators.maxLength(10)],
      language: ['', Validators.maxLength(10)],
      dateFormat: [''],
      timeFormat: [''],

      // API Settings
      apiAccessEnabled: [false],
      apiKey: [''],

      // Status
      isActive: [true],
      isVerified: [false],
      takeOrders: [false],
      verificationDate: [''],
      lastLoginAt: [''],

      // Advanced
      featuresEnabled: [''],
      customSettings: [''],

      // Notes
      notes: ['', Validators.maxLength(1000)]
    });
  }

  loadTenantData() {
    this.isLoadingData = true;
    this.clearMessages();

    this.authService.getCurrentTenantForUpdate().subscribe({
      next: (tenant) => {
        this.isLoadingData = false;
        if (tenant) {
          this.populateForm(tenant);
          if (tenant.logoBase64) {
            this.logoPreview = tenant.logoBase64;
          }
        }
      },
      error: (error) => {
        this.isLoadingData = false;
        this.errorMessage = 'Failed to load restaurant information.';
      }
    });
  }

  populateForm(tenant: TenantMaster) {
    this.restaurantForm.patchValue({
      tenantName: tenant.tenantName,
      businessType: tenant.businessType,
      contactName: tenant.contactName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      contactMobile: tenant.contactMobile,
      alternatePhone: tenant.alternatePhone,
      website: tenant.website,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      postalCode: tenant.postalCode,
      country: tenant.country,
      registrationNumber: tenant.registrationNumber,
      taxId: tenant.taxId,
      licenseNumber: tenant.licenseNumber,
      brandColor: tenant.brandColor,
      timezone: tenant.timezone,
      currency: tenant.currency,
      language: tenant.language,
      notes: tenant.notes
    });
  }

  // Logo handling methods
  onLogoSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select a valid image file.';
        return;
      }

      // Validate file size
      if (file.size > this.maxLogoSize) {
        this.errorMessage = 'Logo file size cannot exceed 5MB.';
        return;
      }

      this.logoFile = file;
      this.clearMessages();

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo() {
    this.logoFile = null;
    this.logoPreview = null;
    // Reset file input
    const fileInput = document.getElementById('logoInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit() {
    if (this.restaurantForm.valid) {
      this.clearMessages();
      this.isLoading = true;

      const request: UpdateTenantRequest = this.restaurantForm.value;

      // Add logo if selected
      if (this.logoFile) {
        const reader = new FileReader();
        reader.onload = () => {
          request.logoBase64 = reader.result as string;
          this.submitForm(request);
        };
        reader.readAsDataURL(this.logoFile);
      } else {
        this.submitForm(request);
      }
    }
  }

  private submitForm(request: UpdateTenantRequest) {
    this.authService.updateTenantInfo(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Restaurant information updated successfully!';
        // Reset logo file after successful upload
        this.logoFile = null;
      },
      error: (error) => {
        this.isLoading = false;

        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid data provided.';
        } else if (error.status === 401) {
          this.errorMessage = 'Unauthorized. Please log in again.';
        } else {
          this.errorMessage = 'Failed to update restaurant information. Please try again.';
        }
      }
    });
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }
}

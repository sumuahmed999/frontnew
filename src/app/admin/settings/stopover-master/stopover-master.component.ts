import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { StepOverService } from '../../../service/stepover.service';

declare var google: any;
declare var bootstrap: any;

export interface StepOverMaster {
  stepOverId: number;
  stepOverName: string;
  latitude: number;
  longitude: number;
  address: string;
  isActive: boolean;
  createdDate: Date;
  updatedDate: Date;
  tenantCount?: number;
  stepOverTenants?: StepOverTenant[];
}

export interface StepOverTenant {
  stepOverTenantId: number;
  stepOverId: number;
  stepOverName: string;
  tenantCode: string;
  isActive: boolean;
  createdDate: Date;
}

export interface TenantCodeItem {
  tenantCode: string;
  tenantName: string;
  isActive: boolean;
}

export interface CreateStepOverRequest {
  stopOverName: string;
  latitude: number;
  longitude: number;
  address: string;
  isActive: boolean;
  tenants: CreateStepOverTenantRequest[];
}

export interface UpdateStepOverRequest extends CreateStepOverRequest {
  stepOverId: number;
}

export interface CreateStepOverTenantRequest {
  tenantName: string;
  tenantCode: string;
  isActive: boolean;
}

@Component({
  selector: 'app-stopover-master',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './stopover-master.component.html',
  styleUrl: './stopover-master.component.scss'
})
export class StopOverMasterComponent implements OnInit {
  @ViewChild('addressInput', { static: false }) addressInputRef!: ElementRef;

  // Form Controls
  stepOverForm!: FormGroup;
  
  // Data
  stepOvers: StepOverMaster[] = [];
  stepOverTenants: StepOverTenant[] = [];
  selectedStepOver: StepOverMaster | null = null;
  tenantCodes: TenantCodeItem[] = [];
  
  // Form Fields for Tenant Codes
  newTenantCode: string = '';
  bulkTenantCodes: string = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  
  // Search and filter
  searchTerm = '';
  filterActive?: boolean;
  sortColumn = 'stepover_name';
  sortDirection = 'ASC';
  
  // UI State
  isLoading = false;
  isLoadingStepOvers = false;
  isGettingLocation = false;
  loadingTenants = false;
  successMessage = '';
  errorMessage = '';
  editingStepOverId: number | null = null;
  
  // Google Maps
  autocomplete: any;
  isGoogleMapsLoaded = false;
  placesService: any;
  geocoder: any;
  tenantModal: any;

  private destroy$ = new Subject<void>();
  private reverseGeocodeTimeout: any;

  // Replace with your actual Google Maps API key
  private readonly GOOGLE_MAPS_API_KEY = 'AIzaSyAbqpnPHWDqvA3TIQPq0xowtJ3ij3Xiqxg';

  constructor(
    private fb: FormBuilder,
    private stepOverService: StepOverService,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadGoogleMaps();
    this.loadStepOvers();
  }

  ngAfterViewInit() {
    // Initialize Bootstrap modal
    const tenantModalElement = document.getElementById('tenantModal');
    if (tenantModalElement) {
      this.tenantModal = new bootstrap.Modal(tenantModalElement);
    }

    // Delay to ensure Google Maps is loaded
    setTimeout(() => {
      if (this.isGoogleMapsLoaded && this.addressInputRef) {
        this.initializeAutocomplete();
      }
    }, 500);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.reverseGeocodeTimeout) {
      clearTimeout(this.reverseGeocodeTimeout);
    }
  }

  // Form Initialization
  initializeForm() {
    this.stepOverForm = this.fb.group({
      stepOverName: ['', [Validators.required, Validators.maxLength(255)]],
      address: ['', [Validators.required, Validators.maxLength(500)]],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      isActive: [true]
    });
  }

  // Google Maps Integration
  loadGoogleMaps() {
    if (typeof google !== 'undefined' && google.maps) {
      this.isGoogleMapsLoaded = true;
      this.initializeGoogleServices();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.ngZone.run(() => {
        this.isGoogleMapsLoaded = true;
        this.initializeGoogleServices();
        if (this.addressInputRef) {
          this.initializeAutocomplete();
        }
      });
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      this.errorMessage = 'Failed to load Google Maps. Please check your API key and internet connection.';
    };
    document.head.appendChild(script);
  }

  initializeGoogleServices() {
    if (typeof google !== 'undefined' && google.maps) {
      this.geocoder = new google.maps.Geocoder();
      const dummyMap = new google.maps.Map(document.createElement('div'));
      this.placesService = new google.maps.places.PlacesService(dummyMap);
    }
  }

  initializeAutocomplete() {
    if (!this.addressInputRef || !this.isGoogleMapsLoaded || !google.maps) return;

    this.autocomplete = new google.maps.places.Autocomplete(
      this.addressInputRef.nativeElement,
      {
        types: ['establishment', 'geocode'],
        fields: ['formatted_address', 'geometry', 'address_components', 'name', 'place_id', 'types']
      }
    );

    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place: any = this.autocomplete.getPlace();
        
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          const displayAddress = place.name && place.types.some((type: string) => 
            ['establishment', 'point_of_interest', 'store'].includes(type)
          ) ? `${place.name}, ${place.formatted_address}` : place.formatted_address;
          
          this.stepOverForm.patchValue({
            address: displayAddress,
            latitude: lat,
            longitude: lng
          });

          if (!this.stepOverForm.get('stepOverName')?.value && place.name) {
            this.stepOverForm.patchValue({
              stepOverName: place.name
            });
          }
        }
      });
    });
  }

  onAddressFocus() {
    if (this.autocomplete) {
      this.autocomplete.set('place', null);
    }
  }

  onAddressInput(event: any) {
    const query = event.target.value;
    
    const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        this.stepOverForm.patchValue({
          latitude: lat,
          longitude: lng
        });
        this.reverseGeocode(lat, lng);
      }
    }
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      this.errorMessage = 'Geolocation is not supported by this browser.';
      return;
    }

    this.isGettingLocation = true;
    this.clearMessages();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          this.stepOverForm.patchValue({
            latitude: lat,
            longitude: lng
          });

          this.reverseGeocode(lat, lng);
          this.isGettingLocation = false;
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.isGettingLocation = false;
          let message = 'Failed to get current location.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          
          this.errorMessage = message;
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  reverseGeocode(lat: number, lng: number) {
    if (!this.geocoder) return;

    const latlng = new google.maps.LatLng(lat, lng);
    
    this.geocoder.geocode({ location: latlng }, (results: any[], status: string) => {
      this.ngZone.run(() => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          
          this.stepOverForm.patchValue({
            address: result.formatted_address
          });
        }
      });
    });
  }

  clearAddress() {
    this.stepOverForm.patchValue({
      address: '',
      latitude: null,
      longitude: null
    });
    
    if (this.addressInputRef) {
      this.addressInputRef.nativeElement.value = '';
    }
  }

  onCoordinateChange() {
    const lat = this.stepOverForm.get('latitude')?.value;
    const lng = this.stepOverForm.get('longitude')?.value;
    
    if (lat && lng && this.isValidCoordinate(lat, lng)) {
      clearTimeout(this.reverseGeocodeTimeout);
      this.reverseGeocodeTimeout = setTimeout(() => {
        this.reverseGeocode(lat, lng);
      }, 1000);
    }
  }

  isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  hasValidCoordinates(): boolean {
    const lat = this.stepOverForm.get('latitude')?.value;
    const lng = this.stepOverForm.get('longitude')?.value;
    return lat && lng && this.isValidCoordinate(lat, lng);
  }

  previewLocation() {
    const lat = this.stepOverForm.get('latitude')?.value;
    const lng = this.stepOverForm.get('longitude')?.value;
    
    if (lat && lng) {
      const url = `https://www.google.com/maps/@${lat},${lng},15z`;
      window.open(url, '_blank');
    }
  }

  viewStepOverOnMap(stepOver: StepOverMaster) {
    if (stepOver.latitude && stepOver.longitude) {
      const url = `https://www.google.com/maps/@${stepOver.latitude},${stepOver.longitude},15z`;
      window.open(url, '_blank');
    }
  }

  // Tenant Code Management
  addTenantCode() {
    const code = this.newTenantCode?.trim().toUpperCase();
    if (!code) return;
    
    // Check for duplicates
    if (this.tenantCodes.some(t => t.tenantCode === code)) {
      this.errorMessage = `Tenant code "${code}" already exists.`;
      return;
    }
    
    this.tenantCodes.push({
      tenantCode: code,
      isActive: true,tenantName: code
    });
    
    this.newTenantCode = '';
    this.clearMessages();
  }

  addBulkTenantCodes() {
    const codes = this.bulkTenantCodes?.trim();
    if (!codes) return;
    
    // Split by comma or newline and clean up
    const codeArray = codes
      .split(/[,\n\r]+/)
      .map(code => code.trim().toUpperCase())
      .filter(code => code.length > 0);
    
    let addedCount = 0;
    let duplicateCount = 0;
    
    codeArray.forEach(code => {
      if (!this.tenantCodes.some(t => t.tenantCode === code)) {
        this.tenantCodes.push({
          tenantCode: code,
          isActive: true,
          tenantName: code  
        });
        addedCount++;
      } else {
        duplicateCount++;
      }
    });
    
    this.bulkTenantCodes = '';
    
    if (addedCount > 0) {
      this.successMessage = `Added ${addedCount} tenant code(s).`;
    }
    
    if (duplicateCount > 0) {
      this.errorMessage = `${duplicateCount} duplicate code(s) were skipped.`;
    }
  }

  removeTenantCode(index: number) {
    if (confirm('Are you sure you want to remove this tenant code?')) {
      this.tenantCodes.splice(index, 1);
    }
  }

  toggleAllTenantCodes(active: boolean) {
    this.tenantCodes.forEach(code => code.isActive = active);
  }

  clearAllTenantCodes() {
    if (confirm('Are you sure you want to remove all tenant codes?')) {
      this.tenantCodes = [];
    }
  }

  trackByTenantCode(index: number, item: TenantCodeItem): string {
    return item.tenantCode;
  }

  // Data Loading
  loadStepOvers() {
    this.isLoadingStepOvers = true;
    this.clearMessages();

    this.stepOverService.getStepOvers(
      this.filterActive,
      this.currentPage,
      this.pageSize
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.isLoadingStepOvers = false;
        if (response.success) {
          this.stepOvers = response.data.map((stepOver: any) => ({
            ...stepOver,
            tenantCount: stepOver.stepOverTenants?.filter((t: any) => t.isActive).length || 0
          }));
          this.totalCount = response.totalCount;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        } else {
          // Handle API response structure
          this.stepOvers = response.Data || response.data || [];
          this.totalCount = response.TotalCount || response.totalCount || 0;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        }
      },
      error: (error) => {
        this.isLoadingStepOvers = false;
        this.errorMessage = 'Failed to load stepovers';
        console.error('Load stepovers error:', error);
      }
    });
  }

  loadStepOverTenants(stepOverId: number) {
    this.loadingTenants = true;
    this.stepOverTenants = [];

    // Implement when tenant service is available
    // this.tenantService.getStepOverTenants(stepOverId, null, true)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (response) => {
    //       this.loadingTenants = false;
    //       if (response.success) {
    //         this.stepOverTenants = response.data;
    //       }
    //     },
    //     error: (error) => {
    //       this.loadingTenants = false;
    //       this.errorMessage = 'Failed to load tenant codes';
    //       console.error('Load tenant codes error:', error);
    //     }
    //   });
  }

  // Search, Sort, and Pagination
  onSearch() {
    this.currentPage = 1;
    this.loadStepOvers();
  }

  onSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.loadStepOvers();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadStepOvers();
  }

  // Form Submission
  onSubmit() {
  if (this.stepOverForm.valid) {
    this.isLoading = true;
    this.clearMessages();

    const formValue = this.stepOverForm.value;
    
    // Create request object matching API structure
    const request: CreateStepOverRequest | UpdateStepOverRequest = {
      stopOverName: formValue.stepOverName,  // Changed from stepOverName to stopOverName
      address: formValue.address,
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      isActive: formValue.isActive,
      tenants: this.tenantCodes.map(code => ({  // Changed from stepOverTenants to tenants
        tenantCode: code.tenantCode,
        tenantName: code.tenantCode,
        isActive: code.isActive,
        // Remove stepOverName and stepOverTenantId as they're not in the API model
      }))
    };

    if (this.editingStepOverId) {
      // For update operations
      (request as UpdateStepOverRequest).stepOverId = this.editingStepOverId;
      this.stepOverService.updateStepOver(this.editingStepOverId, request as UpdateStepOverRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = 'StepOver updated successfully!';
              this.resetForm();
              this.loadStepOvers();
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = this.getErrorMessage(error);
            console.error('Update stepover error:', error);
          }
        });
    } else {
      // For create operations
      this.stepOverService.createStepOver(request as CreateStepOverRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = 'StepOver created successfully!';
              this.resetForm();
              this.loadStepOvers();
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = this.getErrorMessage(error);
            console.error('Create stepover error:', error);
          }
        });
    }
  } else {
    // Mark all fields as touched to show validation errors
    Object.keys(this.stepOverForm.controls).forEach(key => {
      this.stepOverForm.get(key)?.markAsTouched();
    });
  }
}

// Helper method for consistent error handling
private getErrorMessage(error: any): string {
  if (error.error?.message) {
    return error.error.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
}


  // CRUD Operations
  editStepOver(stepOver: StepOverMaster) {
    this.editingStepOverId = stepOver.stepOverId;
    this.stepOverForm.patchValue({
      stepOverName: stepOver.stepOverName,
      address: stepOver.address,
      latitude: stepOver.latitude,
      longitude: stepOver.longitude,
      isActive: stepOver.isActive
    });
    
    // Load tenant codes for editing
    this.tenantCodes = stepOver.stepOverTenants?.map(tenant => ({
      tenantCode: tenant.tenantCode,
      isActive: tenant.isActive,
      tenantName: tenant.tenantCode
    })) || [];
    
    if (this.addressInputRef && stepOver.address) {
      this.addressInputRef.nativeElement.value = stepOver.address;
    }
    
    document.querySelector('.stepover-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteStepOver(stepOver: StepOverMaster) {
    const confirmMessage = `Are you sure you want to delete "${stepOver.stepOverName}"?\n\nThis will also remove all associated tenant codes.\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.stepOverService.deleteStepOver(stepOver.stepOverId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = 'StepOver deleted successfully!';
              this.loadStepOvers();
            }
          },
          error: (error) => {
            this.errorMessage = 'Failed to delete stepover';
            console.error('Delete stepover error:', error);
          }
        });
    }
  }

  viewTenants(stepOver: StepOverMaster) {
    this.selectedStepOver = stepOver;
    this.loadStepOverTenants(stepOver.stepOverId);
    this.tenantModal?.show();
  }

  manageTenants(stepOver: StepOverMaster) {
    // Navigate to tenant management with stepover context
    this.router.navigate(['/admin/tenant-master'], { 
      queryParams: { stepOverId: stepOver.stepOverId, stepOverName: stepOver.stepOverName }
    });
  }

  resetForm() {
    this.stepOverForm.reset();
    this.stepOverForm.patchValue({ isActive: true });
    this.editingStepOverId = null;
    this.tenantCodes = [];
    this.newTenantCode = '';
    this.bulkTenantCodes = '';
    
    if (this.addressInputRef) {
      this.addressInputRef.nativeElement.value = '';
    }
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Utility Methods
  getPaginationNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fas fa-sort';
    return this.sortDirection === 'ASC' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  trackByStepOverId(index: number, stepOver: StepOverMaster): number {
    return stepOver.stepOverId;
  }
}

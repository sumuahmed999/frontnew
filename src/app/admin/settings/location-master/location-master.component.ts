// location-master.component.ts
import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LocationMaster, CreateLocationRequest, UpdateLocationRequest, PlaceResult } from '../../../core/models/location.models';
import { LocationService } from '../../../service/location.service';

declare var google: any;

@Component({
  selector: 'app-location-master',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './location-master.component.html',
  styleUrl: './location-master.component.scss'
})
export class LocationMasterComponent implements OnInit {
  @ViewChild('addressInput', { static: false }) addressInputRef!: ElementRef;

  locationForm!: FormGroup;
  locations: LocationMaster[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  
  // Search and filter
  searchTerm = '';
  filterActive?: boolean;
  sortColumn = 'LocationName';
  sortDirection = 'ASC';
  
  // UI State
  isLoading = false;
  isLoadingLocations = false;
  isGettingLocation = false;
  successMessage = '';
  errorMessage = '';
  editingLocationId: number | null = null;
  
  // Google Maps
  autocomplete: any;
  isGoogleMapsLoaded = false;
  placesService: any;
  geocoder: any;

  // Replace with your actual Google Maps API key
  private readonly GOOGLE_MAPS_API_KEY = 'AIzaSyAbqpnPHWDqvA3TIQPq0xowtJ3ij3Xiqxg';

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private ngZone: NgZone
  ) {}

  // ... rest of your methods remain the same
  ngOnInit() {
    this.initializeForm();
    this.loadGoogleMaps();
    this.loadLocations();
  }


  ngAfterViewInit() {
    // Delay to ensure Google Maps is loaded
    setTimeout(() => {
      if (this.isGoogleMapsLoaded && this.addressInputRef) {
        this.initializeAutocomplete();
      }
    }, 500);
  }

  initializeForm() {
    this.locationForm = this.fb.group({
      locationName: ['', [Validators.required, Validators.maxLength(100)]],
      locationPrefix: ['', [Validators.required, Validators.maxLength(10)]],
      address: ['', Validators.maxLength(500)],
      city: ['', Validators.maxLength(100)],
      state: ['', Validators.maxLength(100)],
      country: ['', Validators.maxLength(100)],
      postalCode: ['', Validators.maxLength(20)],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      isActive: [true]
    });
  }

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
      // Create a dummy map for PlacesService
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
          
          // Use place name if it's a business/establishment, otherwise use formatted address
          const displayAddress = place.name && place.types.some((type: string) => 
            ['establishment', 'point_of_interest', 'store'].includes(type)
          ) ? `${place.name}, ${place.formatted_address}` : place.formatted_address;
          
          this.locationForm.patchValue({
            address: displayAddress,
            latitude: lat,
            longitude: lng
          });

          // Auto-fill location name if not already filled
          if (!this.locationForm.get('locationName')?.value && place.name) {
            this.locationForm.patchValue({
              locationName: place.name
            });
          }

          // Extract address components
          if (place.address_components) {
            this.extractAddressComponents(place.address_components);
          }
        }
      });
    });
  }

  extractAddressComponents(components: any[]) {
    const city = this.getAddressComponent(components, ['locality', 'administrative_area_level_2']);
    const state = this.getAddressComponent(components, ['administrative_area_level_1']);
    const country = this.getAddressComponent(components, ['country']);
    const postalCode = this.getAddressComponent(components, ['postal_code']);

    this.locationForm.patchValue({
      city: city,
      state: state,
      country: country,
      postalCode: postalCode
    });
  }

  getAddressComponent(components: any[], types: string[]): string {
    for (const component of components) {
      for (const type of types) {
        if (component.types.includes(type)) {
          return component.long_name;
        }
      }
    }
    return '';
  }

  onAddressFocus() {
    // Clear the input to show all suggestions
    if (this.autocomplete) {
      this.autocomplete.set('place', null);
    }
  }

  onAddressInput(event: any) {
    const query = event.target.value;
    
    // If user types coordinates directly (lat, lng format)
    const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        this.locationForm.patchValue({
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
          
          this.locationForm.patchValue({
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
          
          this.locationForm.patchValue({
            address: result.formatted_address
          });

          if (result.address_components) {
            this.extractAddressComponents(result.address_components);
          }
        }
      });
    });
  }

  clearAddress() {
    this.locationForm.patchValue({
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      latitude: null,
      longitude: null
    });
    
    if (this.addressInputRef) {
      this.addressInputRef.nativeElement.value = '';
    }
  }

  onCoordinateChange() {
    const lat = this.locationForm.get('latitude')?.value;
    const lng = this.locationForm.get('longitude')?.value;
    
    if (lat && lng && this.isValidCoordinate(lat, lng)) {
      // Debounce the reverse geocoding
      clearTimeout(this.reverseGeocodeTimeout);
      this.reverseGeocodeTimeout = setTimeout(() => {
        this.reverseGeocode(lat, lng);
      }, 1000);
    }
  }

  private reverseGeocodeTimeout: any;

  isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  hasValidCoordinates(): boolean {
    const lat = this.locationForm.get('latitude')?.value;
    const lng = this.locationForm.get('longitude')?.value;
    return lat && lng && this.isValidCoordinate(lat, lng);
  }

  previewLocation() {
    const lat = this.locationForm.get('latitude')?.value;
    const lng = this.locationForm.get('longitude')?.value;
    
    if (lat && lng) {
      const url = `https://www.google.com/maps/@${lat},${lng},15z`;
      window.open(url, '_blank');
    }
  }

  viewLocationOnMap(location: LocationMaster) {
    if (location.latitude && location.longitude) {
      const url = `https://www.google.com/maps/@${location.latitude},${location.longitude},15z`;
      window.open(url, '_blank');
    }
  }

  loadLocations() {
    this.isLoadingLocations = true;
    this.clearMessages();

    this.locationService.getLocations(
      this.searchTerm,
      this.filterActive,
      this.currentPage,
      this.pageSize,
      this.sortColumn,
      this.sortDirection
    ).subscribe({
      next: (response) => {
        this.isLoadingLocations = false;
        if (response.success) {
          this.locations = response.data;
          this.totalCount = response.pagination.totalCount;
          this.totalPages = response.pagination.totalPages;
        }
      },
      error: (error) => {
        this.isLoadingLocations = false;
        this.errorMessage = 'Failed to load locations';
        console.error('Load locations error:', error);
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadLocations();
  }

  onSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'ASC';
    }
    this.loadLocations();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadLocations();
  }

  onSubmit() {
    if (this.locationForm.valid) {
      this.isLoading = true;
      this.clearMessages();

      const formValue = this.locationForm.value;
      const request: CreateLocationRequest | UpdateLocationRequest = {
        locationName: formValue.locationName,
        locationPrefix: formValue.locationPrefix.toUpperCase(),
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        country: formValue.country,
        postalCode: formValue.postalCode,
        latitude: formValue.latitude,
        longitude: formValue.longitude,
        isActive: formValue.isActive
      };

      if (this.editingLocationId) {
        // Update
        (request as UpdateLocationRequest).locationId = this.editingLocationId;
        this.locationService.updateLocation(this.editingLocationId, request as UpdateLocationRequest).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = 'Location updated successfully!';
              this.resetForm();
              this.loadLocations();
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Failed to update location';
            console.error('Update location error:', error);
          }
        });
      } else {
        // Create
        this.locationService.createLocation(request as CreateLocationRequest).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = 'Location created successfully!';
              this.resetForm();
              this.loadLocations();
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Failed to create location';
            console.error('Create location error:', error);
          }
        });
      }
    } else {
      Object.keys(this.locationForm.controls).forEach(key => {
        this.locationForm.get(key)?.markAsTouched();
      });
    }
  }

  editLocation(location: LocationMaster) {
    this.editingLocationId = location.locationId;
    this.locationForm.patchValue({
      locationName: location.locationName,
      locationPrefix: location.locationPrefix,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      postalCode: location.postalCode,
      latitude: location.latitude,
      longitude: location.longitude,
      isActive: location.isActive
    });
    
    // Update the address input field
    if (this.addressInputRef && location.address) {
      this.addressInputRef.nativeElement.value = location.address;
    }
    
    // Scroll to form
    document.querySelector('.location-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteLocation(location: LocationMaster) {
    const confirmMessage = `Are you sure you want to delete "${location.locationName}"?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.locationService.deleteLocation(location.locationId).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Location deleted successfully!';
            this.loadLocations();
          }
        },
        error: (error) => {
          this.errorMessage = 'Failed to delete location';
          console.error('Delete location error:', error);
        }
      });
    }
  }

  resetForm() {
    this.locationForm.reset();
    this.locationForm.patchValue({ isActive: true });
    this.editingLocationId = null;
    
    // Clear the address input
    if (this.addressInputRef) {
      this.addressInputRef.nativeElement.value = '';
    }
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Utility methods
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

  // Track function for ngFor
  trackByLocationId(index: number, location: LocationMaster): number {
    return location.locationId;
  }
}

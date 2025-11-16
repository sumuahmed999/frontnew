import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LocationService } from '../../../service/location.service';
import { StepOverService } from '../../../service/stepover.service';
import { RouteService, RouteRequest, RouteResponse } from '../../../service/route.service';
import { Coordinate, DistanceCalculationService } from '../../../service/distance-calculation.service';

// Updated interface to match your API response
export interface StepOver {
  stepOverId: number;
  stepOverName: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdDate: string;
  updatedDate: string;
  tenants?: Array<{
    stepOverTenantId: number;
    stepOverId: number;
    stepOverName: string;
    tenantCode: string;
    isActive: boolean;
    createdDate: string;
  }>;
}

export interface Location {
  locationId: number;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

@Component({
  selector: 'app-route-master',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './route-master.component.html',
  styleUrl: './route-master.component.scss'
})
export class RouteMasterComponent implements OnInit, OnDestroy {
  routeForm!: FormGroup;
  isCalculatingDistance = false;

  // Data arrays
  locations: Location[] = [];
  stepOvers: StepOver[] = [];
  routes: RouteResponse[] = [];

  // Loading states
  isLoadingLocations = false;
  isLoadingStepOvers = false;
  isLoadingRoutes = false;
  isSubmitting = false;

  // UI state
  successMessage = '';
  errorMessage = '';
  editingRouteId: number | null = null;

  // Pagination and filtering for locations
  searchTerm = '';
  filterActive?: boolean;
  currentPage = 1;
  pageSize = 100;
  sortColumn = 'locationName';
  sortDirection = 'ASC';
  totalCount = 0;
  totalPages = 0;

  // Route listing pagination
  routeCurrentPage = 1;
  routePageSize = 10;
  routeTotalCount = 0;
  routeTotalPages = 0;
  routeSearchTerm = '';
  routeFilterActive?: boolean;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private stepOverService: StepOverService,
    private routeService: RouteService,
    private distanceCalculationService: DistanceCalculationService
  ) { }

  ngOnInit() {
    this.initializeForm();
    this.loadLocations();
    this.loadStepOvers();
    this.loadRoutes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm() {
    this.routeForm = this.fb.group({
      routeName: ['', [Validators.required, Validators.maxLength(255)]],
      startLocationId: ['', Validators.required],
      endLocationId: ['', Validators.required],
      distance: ['', [Validators.min(0)]],
      estimatedTime: ['', Validators.maxLength(50)],
      isActive: [true],
      stepOvers: this.fb.array([])
    });

    // Don't add empty stepover initially - let user add when needed
    console.log('Form initialized');
  }


  // Getter for stepOvers FormArray
  get stepOversArray(): FormArray {
    return this.routeForm.get('stepOvers') as FormArray;
  }

  // Load all routes
  loadRoutes() {
    this.isLoadingRoutes = true;
    this.clearMessages();

    this.routeService.getRoutes(
      this.routeFilterActive,
      this.routeCurrentPage,
      this.routePageSize,
      this.routeSearchTerm
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoadingRoutes = false;
          if (response.success && response.data) {
            this.routes = response.data;
            this.routeTotalCount = response.totalCount || 0;
            this.routeTotalPages = response.totalPages || 0;
            console.log('Routes loaded:', this.routes);
          }
        },
        error: (error) => {
          this.isLoadingRoutes = false;
          this.errorMessage = 'Failed to load routes';
          console.error('Load routes error:', error);
        }
      });
  }

  // Load locations from service
  loadLocations() {
    this.isLoadingLocations = true;

    this.locationService.getLocations(
      this.searchTerm,
      this.filterActive,
      this.currentPage,
      this.pageSize,
      this.sortColumn,
      this.sortDirection
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoadingLocations = false;
          console.log('Location API Response:', response);

          if (response?.success && response?.data) {
            this.locations = response.data.filter((loc: Location) => loc.isActive);
            console.log('Processed Locations for dropdown:', this.locations);
          } else {
            console.error('Invalid location response format:', response);
            this.locations = [];
          }
        },
        error: (error: any) => {
          this.isLoadingLocations = false;
          this.errorMessage = 'Failed to load locations';
          console.error('Load locations error:', error);
        }
      });
  }

  // Load stepovers from service
  loadStepOvers() {
    this.isLoadingStepOvers = true;
    console.log('Loading step overs...');

    this.stepOverService.getStepOvers(true, 1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isLoadingStepOvers = false;
          console.log('StepOver API Response:', response);

          if (response?.data && Array.isArray(response.data)) {
            this.stepOvers = response.data
              .filter((stepOver: any) => stepOver.isActive === true)
              .map((stepOver: any) => ({
                stepOverId: stepOver.stepOverId,
                stepOverName: stepOver.stepOverName,
                address: stepOver.address,
                latitude: stepOver.latitude,
                longitude: stepOver.longitude,
                isActive: stepOver.isActive,
                createdDate: stepOver.createdDate,
                updatedDate: stepOver.updatedDate,
                tenants: stepOver.tenants || []
              }));

            console.log('Processed StepOvers for dropdown:', this.stepOvers);

            if (this.stepOvers.length === 0) {
              console.warn('No active step overs found');
            }
          } else {
            console.error('Invalid stepover response format:', response);
            this.stepOvers = [];
          }
        },
        error: (error: any) => {
          this.isLoadingStepOvers = false;
          console.error('StepOver loading error:', error);
          this.stepOvers = [];
        }
      });
  }
  onStepOverLocationChange() {
    const startLocationId = this.routeForm.get('startLocationId')?.value;
    const endLocationId = this.routeForm.get('endLocationId')?.value;

    if (startLocationId && endLocationId && startLocationId !== endLocationId) {
      this.calculateAndAddStepOverLocation(startLocationId);
    }
  }
  calculateAndAddStepOverLocation(startLocationId: any) {
    const startLocation = this.locations.find(loc => loc.locationId === parseInt(startLocationId));

  }
  // Location selection change handler
  onLocationSelectionChange() {
    const startLocationId = this.routeForm.get('startLocationId')?.value;
    const endLocationId = this.routeForm.get('endLocationId')?.value;

    if (startLocationId && endLocationId && startLocationId !== endLocationId) {
      this.calculateRouteDistanceAndTime();
    }
  }


  // Calculate distance and time for the route
  calculateRouteDistanceAndTime() {
    const startLocationId = parseInt(this.routeForm.get('startLocationId')?.value);
    const endLocationId = parseInt(this.routeForm.get('endLocationId')?.value);

    const startLocation = this.locations.find(loc => loc.locationId === startLocationId);
    const endLocation = this.locations.find(loc => loc.locationId === endLocationId);

    if (!startLocation || !endLocation) {
      return;
    }

    this.isCalculatingDistance = true;
    this.clearMessages();

    const startCoord: Coordinate = {
      latitude: startLocation.latitude,
      longitude: startLocation.longitude
    };

    const endCoord: Coordinate = {
      latitude: endLocation.latitude,
      longitude: endLocation.longitude
    };

    // Get selected stepover coordinates
    const stepOverCoords: Coordinate[] = [];
    this.stepOversArray.controls.forEach(control => {
      const stepOverId = parseInt(control.get('stepOverId')?.value);
      if (stepOverId) {
        const stepOver = this.stepOvers.find(so => so.stepOverId === stepOverId);
        if (stepOver) {
          stepOverCoords.push({
            latitude: stepOver.latitude,
            longitude: stepOver.longitude
          });
        }
      }
    });

    // Fallback to straight-line distance calculation
    this.calculateStraightLineDistance(startCoord, endCoord, stepOverCoords);
  }

  // Fallback method using Haversine formula
  private calculateStraightLineDistance(startCoord: Coordinate, endCoord: Coordinate, stepOverCoords: Coordinate[]) {
    let totalDistance = 0;

    // Calculate distance through all waypoints
    const allCoords = [startCoord, ...stepOverCoords, endCoord];

    for (let i = 0; i < allCoords.length - 1; i++) {
      const segmentDistance = this.distanceCalculationService.calculateStraightLineDistance(
        allCoords[i],
        allCoords[i + 1]
      );
      totalDistance += segmentDistance;
    }

    // Estimate travel time (assuming average speed of 50 km/h)
    const estimatedTime = this.distanceCalculationService.estimateTravelTime(totalDistance, 50);

    // Update form
    this.routeForm.patchValue({
      distance: Math.round(totalDistance * 100) / 100,
      estimatedTime: estimatedTime.formatted
    });

    this.isCalculatingDistance = false;
    this.successMessage = `Distance: ${Math.round(totalDistance * 100) / 100} km, Estimated time: ${estimatedTime.formatted}`;
  }

  // Add new stepover dropdown
  // Add new stepover dropdown - remove validation temporarily
  addStepOver() {
    const stepOverGroup = this.fb.group({
      stepOverId: [''] // Remove required validation temporarily
    });
    this.stepOversArray.push(stepOverGroup);
    console.log('Added stepOver, total count:', this.stepOversArray.length);
  }

  // Remove stepover dropdown
  removeStepOver(index: number) {
    console.log(`Removing stepOver at index ${index}`);
    this.stepOversArray.removeAt(index);
    if (this.stepOversArray.length === 0) {
      this.addStepOver();
    }
    console.log('After removal, total count:', this.stepOversArray.length);
  }


  // Get location name by ID
  getLocationName(locationId: number): string {
    const location = this.locations.find(loc => loc.locationId === locationId);
    return location ? location.locationName : '';
  }

  // Get stepover name by ID
  // Get stepover name by ID with debugging
  getStepOverName(stepOverId: number): string {
    console.log(`Looking for stepOver with ID: ${stepOverId}`);
    console.log('Available stepOvers:', this.stepOvers.map(so => ({ id: so.stepOverId, name: so.stepOverName })));

    const stepOver = this.stepOvers.find(so => so.stepOverId === stepOverId);
    const result = stepOver ? stepOver.stepOverName : '';

    console.log(`StepOver name result: "${result}"`);
    return result;
  }

  getLatLng(stepOverId: number): { lat: number, lng: number } | null {
    console.log(`Looking for stepOver with ID: ${stepOverId}`);
    console.log('Available stepOvers:', this.stepOvers.map(so => ({
      id: so.stepOverId,
      name: so.stepOverName,
      lat: so.latitude,
      lng: so.longitude
    })));

    const stepOver = this.stepOvers.find(so => so.stepOverId === stepOverId);

    const result = stepOver ? { lat: stepOver.latitude, lng: stepOver.longitude } : null;

    console.log('StepOver lat/lng result:', result);
    return result;
  }



  // Validate form before submission
  private validateForm(): boolean {
    if (this.routeForm.invalid) {
      this.markFormGroupTouched(this.routeForm);
      return false;
    }

    const startLocationId = this.routeForm.get('startLocationId')?.value;
    const endLocationId = this.routeForm.get('endLocationId')?.value;

    if (startLocationId === endLocationId) {
      this.errorMessage = 'Start and End locations cannot be the same';
      return false;
    }

    return true;
  }

  // Mark all form fields as touched
  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched({ onlySelf: true });
      }
    });
  }

  // Form submission
  // Form submission with detailed debugging
  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const formValue = this.routeForm.value;

    // DEBUG: Log the raw form value
    console.log('Raw form value:', formValue);
    console.log('StepOvers form array value:', formValue.stepOvers);

    // Check each step over control
    this.stepOversArray.controls.forEach((control, index) => {
      console.log(`StepOver ${index}:`, control.value);
      console.log(`StepOver ${index} valid:`, control.valid);
      console.log(`StepOver ${index} stepOverId:`, control.get('stepOverId')?.value);
    });

    // Process step overs with detailed logging
    const processedStepOvers = formValue.stepOvers
      .map((so: any, index: number) => {
        console.log(`Processing stepOver ${index}:`, so);
        console.log(`stepOverId: "${so.stepOverId}", type: ${typeof so.stepOverId}`);

        if (so.stepOverId && so.stepOverId !== '') {
          const stepOverId = parseInt(so.stepOverId);
          const stepOverName = this.getStepOverName(stepOverId);
          console.log(`Found stepOver: ID=${stepOverId}, Name="${stepOverName}"`);

          return {
            id: stepOverId,
            name: stepOverName,
            latitude: this.getLatLng(stepOverId)?.lat || 0,
            longitude: this.getLatLng(stepOverId)?.lng || 0,
            distance: 0,
            time: 0
          };
        } else {
          console.log(`Skipping empty stepOver ${index}`);
          return null;
        }
      })
      .filter((so: any) => so !== null); // Remove null entries

    console.log('Processed stepOvers:', processedStepOvers);

    // Prepare the data structure to send to the API
    const routeData: RouteRequest = {
      routeName: formValue.routeName,
      startLocation: {
        id: parseInt(formValue.startLocationId),
        name: this.getLocationName(parseInt(formValue.startLocationId))
      },
      endLocation: {
        id: parseInt(formValue.endLocationId),
        name: this.getLocationName(parseInt(formValue.endLocationId))
      },
      distance: formValue.distance ? parseFloat(formValue.distance) : 0,
      estimatedTime: formValue.estimatedTime || '',
      isActive: formValue.isActive,
      stepOvers: processedStepOvers
    };

    console.log('Final Route Data to Save:', routeData);

    // Call API to save or update route
    const apiCall = this.editingRouteId
      ? this.routeService.updateRoute(this.editingRouteId, routeData)
      : this.routeService.createRoute(routeData);

    apiCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        console.log('API Response:', response);
        if (response.success) {
          this.successMessage = this.editingRouteId
            ? `Route "${routeData.routeName}" updated successfully!`
            : `Route "${routeData.routeName}" created successfully!`;
          this.resetForm();
          this.loadRoutes();
        } else {
          this.errorMessage = response.message || 'Failed to save route';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Failed to save route';
        console.error('Save route error:', error);
      }
    });
  }


  // Edit route
  editRoute(route: RouteResponse) {
    this.editingRouteId = route.routeId;

    // Fill form with route data
    this.routeForm.patchValue({
      routeName: route.routeName,
      startLocationId: route.startLocation.id,
      endLocationId: route.endLocation.id,
      distance: route.distanceKm,
      estimatedTime: route.estimatedTime,
      isActive: route.isActive
    });

    // Clear existing step overs and add the ones from the route
    while (this.stepOversArray.length !== 0) {
      this.stepOversArray.removeAt(0);
    }

    if (route.stepOvers && route.stepOvers.length > 0) {
      route.stepOvers.forEach(stepOver => {
        const stepOverGroup = this.fb.group({
          stepOverId: [stepOver.id]
        });
        this.stepOversArray.push(stepOverGroup);
      });
    } else {
      this.addStepOver();
    }

    // Scroll to form
    document.querySelector('.route-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  // Delete route
  deleteRoute(route: RouteResponse) {
    const confirmMessage = `Are you sure you want to delete route "${route.routeName}"?\n\nThis action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.routeService.deleteRoute(route.routeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = `Route "${route.routeName}" deleted successfully!`;
              this.loadRoutes(); // Reload the routes list
            } else {
              this.errorMessage = response.message || 'Failed to delete route';
            }
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Failed to delete route';
            console.error('Delete route error:', error);
          }
        });
    }
  }

  // Reset form
  resetForm() {
    this.routeForm.reset();
    this.routeForm.patchValue({ isActive: true });
    this.editingRouteId = null;

    // Clear stepOvers array and add one empty stepover
    while (this.stepOversArray.length !== 0) {
      this.stepOversArray.removeAt(0);
    }
    this.addStepOver();
    this.clearMessages();
  }

  // Route list pagination
  onRoutePageChange(page: number) {
    this.routeCurrentPage = page;
    this.loadRoutes();
  }

  // Route list search
  onRouteSearch() {
    this.routeCurrentPage = 1;
    this.loadRoutes();
  }

  // Get pagination numbers for route list
  getRoutePaginationNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.routeCurrentPage - 2);
    const end = Math.min(this.routeTotalPages, this.routeCurrentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Clear messages
  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Track by functions for ngFor
  trackByLocationId(index: number, location: Location): number {
    return location.locationId;
  }

  trackByStepOverId(index: number, stepOver: StepOver): number {
    return stepOver.stepOverId;
  }

  trackByRouteId(index: number, route: RouteResponse): number {
    return route.routeId;
  }

  trackByIndex(index: number): number {
    return index;
  }
  // Helper methods for step overs display
  getStepOverCount(route: RouteResponse): number {
    return route.stepOvers?.length || 0;
  }

  hasStepOvers(route: RouteResponse): boolean {
    return route.stepOvers && route.stepOvers.length > 0;
  }

  getStepOverNames(route: RouteResponse): string {
    if (!route.stepOvers || route.stepOvers.length === 0) {
      return '';
    }

    return route.stepOvers
      .filter(so => so && (so.name)) // Filter out invalid entries
      .map(so => so.name) // Handle different property names
      .join(', ');
  }

}

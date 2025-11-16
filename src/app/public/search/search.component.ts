// search.component.ts (Complete with GUID support)
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocationSelectComponent } from '../location-select/location-select.component';
import { catchError, throwError } from 'rxjs';
import { EndLocationDto, LocationModel, StartLocationDto } from '../../core/models/location-search.models';
import { environment } from '../../../environments/environment';

interface RouteSearchResponse {
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

interface StepOverDetail {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distance: number;
  time: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  errors?: string[];
}

interface BookingRequest {
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

interface BookingResponse {
  bookingId: string; // Changed to string to handle GUID
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

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule, LocationSelectComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent implements OnInit {
  // API Base URL - Fixed in component
  private readonly baseUrl = environment.apiBaseUrl;

  // Form properties
  boardingPoint: LocationModel | null = null;
  destination: LocationModel | null = null;
  departureDate: string = '';
  departureTime: string = '';
  busName: string = '';
  busNumber: string = '';

  // Loading and error states
  isLoading = false;
  error: string = '';
  searchResults: RouteSearchResponse[] = [];

  // Available locations
  startLocations: LocationModel[] = [];
  endLocations: LocationModel[] = [];

  constructor(
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.initializeForm();
    this.loadStartLocations();
  }

// search.component.ts - Updated initializeForm method
private initializeForm() {
  // Get current date in user's local timezone
  const today = new Date();
  const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
  this.departureDate = localDate.toISOString().split('T')[0];

  // Set default time to current time + 1 hour
  const now = new Date();
  now.setHours(now.getHours() + 1);
  this.departureTime = now.toTimeString().slice(0, 5);
}

// Updated date validation in HTML template


  private loadStartLocations() {
    console.log('Loading start locations...');
    
    this.http.get<StartLocationDto[]>(`${this.baseUrl}/search/start-locations`)
      .pipe(
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (locations) => {
          console.log('Start locations loaded:', locations);
          this.startLocations = locations.map(loc => ({
            id: loc.startLocationId,
            name: loc.startLocationName,
            state: loc.state,
            city: loc.city,
            country: loc.country,
            type: 'city' as const
          }));
        },
        error: (error) => {
          console.error('Error loading start locations:', error);
          this.error = 'Failed to load start locations. Please try again.';
        }
      });
  }

  private loadEndLocations(startLocationId: number) {
    if (startLocationId <= 0) return;

    console.log('Loading end locations for start location ID:', startLocationId);

    this.http.get<EndLocationDto[]>(`${this.baseUrl}/search/end-locations/${startLocationId}`)
      .pipe(
        catchError(this.handleError.bind(this))
      )
      .subscribe({
        next: (locations) => {
          console.log('End locations loaded:', locations);
          this.endLocations = locations.map(loc => ({
            id: loc.endLocationId,
            name: loc.endLocationName,
            state: loc.state,
            city: loc.city,
            country: loc.country,
            type: 'city' as const
          }));
        },
        error: (error) => {
          console.error('Error loading end locations:', error);
          this.error = 'Failed to load destination locations. Please try again.';
        }
      });
  }

  onBoardingPointSelected(location: LocationModel) {
    this.boardingPoint = location;
    this.destination = null;
    this.endLocations = [];
    this.error = '';

    if (location && location.id) {
      this.loadEndLocations(location.id);
    }
  }

  onDestinationSelected(location: LocationModel) {
    this.destination = location;
    this.error = '';
  }

  isFormValid(): boolean {
    return !!(
      this.boardingPoint &&
      this.destination &&
      this.departureDate &&
      this.departureTime &&
      this.busName?.trim() &&
      this.busNumber?.trim() &&
      this.boardingPoint.id !== this.destination.id
    );
  }

  searchRoute() {
    if (!this.isFormValid() || !this.boardingPoint || !this.destination) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    this.error = '';

    // Search for available routes
    this.searchRoutes(
      this.boardingPoint.id,
      this.destination.id,
      this.departureDate
    );
  }

  private searchRoutes(
    startLocationId: number,
    endLocationId: number,
    departureDate?: string
  ) {
    const params: any = {
      startLocationId: startLocationId.toString(),
      endLocationId: endLocationId.toString(),
      page: '1',
      pageSize: '10'
    };

    if (departureDate) {
      params.departureDate = departureDate;
    }

    const queryString = new URLSearchParams(params).toString();
    console.log('Searching routes with params:', params);

    this.http.get<ApiResponse<RouteSearchResponse[]>>(
      `${this.baseUrl}/search/routes?${queryString}`
    ).pipe(
      catchError(this.handleError.bind(this))
    ).subscribe({
      next: (routeResponse) => {
        console.log('Route search response:', routeResponse);
        
        if (routeResponse?.success && routeResponse.data && routeResponse.data.length > 0) {
          this.searchResults = routeResponse.data;
          
          // Create booking with the first available route
          const bookingData: BookingRequest = {
            busNumber: this.busNumber.trim(),
            busName: this.busName.trim(),
            startLocationId: this.boardingPoint!.id,
            startLocationName: this.boardingPoint!.name,
            endLocationId: this.destination!.id,
            endLocationName: this.destination!.name,
            departureDate: this.departureDate,
            departureTime: this.departureTime.includes(':') && this.departureTime.split(':').length === 2 
              ? this.departureTime + ':00' 
              : this.departureTime, // Add seconds for TimeSpan
            tenantId: 1
          };

          // Call create booking
          this.createBooking(bookingData);
        } else {
          this.error = 'No routes found for the selected locations and date';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error searching routes:', error);
        this.error = error?.message || 'An error occurred while searching for routes';
        this.isLoading = false;
      }
    });
  }

 // search.component.ts - Updated navigation section
private createBooking(bookingData: BookingRequest) {
  console.log('Creating booking:', bookingData);

  this.http.post<ApiResponse<BookingResponse>>(
    `${this.baseUrl}/search/booking`,
    bookingData
  ).pipe(
    catchError(this.handleError.bind(this))
  ).subscribe({
    next: (bookingResponse) => {
      console.log('Booking response:', bookingResponse);
      
      if (bookingResponse?.success && bookingResponse.data) {
        // Navigate with only bookingId - clean approach
        this.router.navigate(['/stop-overs'], {
          queryParams: {
            bookingId: bookingResponse.data.bookingId
          }
        });
      } else {
        this.error = bookingResponse?.message || 'Failed to create booking';
      }
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error creating booking:', error);
      this.error = error?.message || 'Failed to create booking. Please try again.';
      this.isLoading = false;
    }
  });
}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      console.log('Server error details:', {
        status: error.status,
        statusText: error.statusText,
        error: error.error,
        message: error.message,
        url: error.url
      });

      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check your connection.';
          break;
        case 404:
          errorMessage = 'API endpoint not found. Please check the server configuration.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  setPopularRoute(boarding: LocationModel, destination: LocationModel) {
    this.boardingPoint = boarding;
    this.destination = destination;
  }

  getPopularRoutes() {
    const locations = {
      mumbai: { id: 1, name: 'Mumbai', code: 'MUM', state: 'Maharashtra', type: 'city' as const },
      delhi: { id: 2, name: 'Delhi', code: 'DEL', state: 'Delhi', type: 'city' as const },
      bangalore: { id: 3, name: 'Bangalore', code: 'BLR', state: 'Karnataka', type: 'city' as const },
      chennai: { id: 4, name: 'Chennai', code: 'CHE', state: 'Tamil Nadu', type: 'city' as const }
    };

    return [
      { from: locations.mumbai, to: locations.delhi },
      { from: locations.bangalore, to: locations.chennai },
      { from: locations.delhi, to: locations.bangalore }
    ];
  }
}

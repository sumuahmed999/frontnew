// stop-overs.component.ts - Updated with Dynamic Calculations
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, throwError, finalize } from 'rxjs';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CompleteBookingResponse {
  bookingId: string;
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
  route: {
    routeId: number;
    routeName: string;
    distanceKm: number;
    estimatedTime: string;
    isActive: boolean;
  };
  stepOvers: StepOverDetail[];
}

interface StepOverDetail {
  id: number;
  name: string;
  code: string;
  distance: number;
  time: number;
  latitude: number;
  longitude: number;
  address: string;
  arrivalTime: string;
  stopDuration: string;
  restaurantCount: number;
  rating: number;
  popularItems: string[];
  stopOrder: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

@Component({
  selector: 'app-stop-overs',
  imports: [CommonModule],
  templateUrl: './stop-overs.component.html',
  styleUrl: './stop-overs.component.scss'
})
export class StopOversComponent implements OnInit, OnDestroy {
  private readonly baseUrl = environment.apiBaseUrl;
  private subscription = new Subscription();
 isScrolled = false;
  // Booking data
  bookingId: string = '';
  bookingDetails: CompleteBookingResponse | null = null;
  @HostListener('window:scroll', ['$event'])
  onScroll(event: any): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollTop > 50;
  }
  // UI state
  isLoading = false;
  error = '';
  selectedStopOver: StepOverDetail | null = null;

  // Computed properties
  get fromLocation(): string {
    return this.bookingDetails?.startLocation?.name || '';
  }

  get toLocation(): string {
    return this.bookingDetails?.endLocation?.name || '';
  }

  get departureDate(): string {
    return this.bookingDetails?.departureDate || '';
  }

  get departureTime(): string {
    return this.bookingDetails?.departureTime || '';
  }

  get formattedDate(): string {
    if (!this.departureDate) return '';
    const date = new Date(this.departureDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  get stopOvers(): StepOverDetail[] {
    return this.bookingDetails?.stepOvers || [];
  }

  get busInfo(): string {
    if (!this.bookingDetails) return '';
    return `${this.bookingDetails.busName} (${this.bookingDetails.busNumber})`;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const paramsSub = this.route.queryParams.subscribe(params => {
      this.bookingId = params['bookingId'];
      if (this.bookingId) {
        this.loadBookingDetails();
      } else {
        this.error = 'No booking ID provided';
        this.router.navigate(['/']);
      }
    });

    this.subscription.add(paramsSub);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // TrackBy function
  trackByStopId(index: number, item: StepOverDetail): number {
    return item.id;
  }

  // Dynamic Distance Calculations
  getTotalDistance(): number {
    return this.bookingDetails?.route?.distanceKm || 0;
  }

  getDistanceFromStart(stopOver: StepOverDetail): number {
    // Use the distance property from the stopOver, or calculate based on order
    return Math.round(stopOver.distance || (stopOver.stopOrder * (this.getTotalDistance() / (this.stopOvers.length + 1))));
  }

  getRemainingDistance(stopOver: StepOverDetail): number {
    const distanceFromStart = this.getDistanceFromStart(stopOver);
    const totalDistance = this.getTotalDistance();
    return Math.round(totalDistance - distanceFromStart);
  }

  // Dynamic Time Calculations
  getTotalJourneyTime(): string {
    if (this.bookingDetails?.route?.estimatedTime) {
      return this.bookingDetails.route.estimatedTime;
    }
    
    // Calculate based on distance (assuming average speed of 60 km/h)
    const totalDistance = this.getTotalDistance();
    const hours = Math.floor(totalDistance / 60);
    const minutes = Math.round((totalDistance % 60) * 60 / 60);
    
    return `${hours}h ${minutes}m`;
  }

  getCalculatedArrivalTime(stopOver: StepOverDetail): string {
    if (!this.departureTime) return 'TBD';

    try {
      // Parse departure time
      const [depHours, depMinutes] = this.departureTime.split(':').map(Number);
      const departureTimeMinutes = depHours * 60 + depMinutes;
      
      // Calculate travel time to this stop (assuming average speed of 50 km/h including stops)
      const distanceToStop = this.getDistanceFromStart(stopOver);
      const travelTimeMinutes = Math.round(distanceToStop / 50 * 60);
      
      // Add buffer time for previous stops
      const bufferTime = (stopOver.stopOrder - 1) * 15; // 15 minutes per previous stop
      
      // Calculate arrival time
      const arrivalTimeMinutes = departureTimeMinutes + travelTimeMinutes + bufferTime;
      const arrivalHours = Math.floor(arrivalTimeMinutes / 60) % 24;
      const arrivalMins = arrivalTimeMinutes % 60;
      
      // Format time
      const hour12 = arrivalHours % 12 || 12;
      const ampm = arrivalHours >= 12 ? 'PM' : 'AM';
      
      return `${hour12}:${arrivalMins.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      console.error('Error calculating arrival time:', error);
      return 'TBD';
    }
  }

  getCalculatedStopDuration(stopOver: StepOverDetail): string {
    // Base stop duration varies by stop order and type
    const baseDuration = 15; // 15 minutes base
    const orderMultiplier = Math.max(1, stopOver.stopOrder * 2); // Longer stops at major stops
    const calculatedDuration = Math.min(baseDuration + orderMultiplier, 30); // Max 30 minutes
    
    return `${calculatedDuration} min`;
  }

  private loadBookingDetails() {
    if (!this.bookingId) return;

    this.isLoading = true;
    this.error = '';

    const detailsSub = this.http.get<ApiResponse<CompleteBookingResponse>>(
      `${this.baseUrl}/search/booking/${this.bookingId}/details`
    ).pipe(
      catchError(error => {
        console.error('Error loading booking details:', error);
        this.error = error?.error?.message || 'Failed to load booking details';
        return throwError(() => error);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.bookingDetails = response.data;
          console.log('Booking details loaded:', this.bookingDetails);
        } else {
          this.error = response.message || 'No booking data found';
        }
      },
      error: (error) => {
        // Error already handled in catchError
      }
    });

    this.subscription.add(detailsSub);
  }

  formatTime(time: string): string {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const hour12 = parseInt(hours) % 12 || 12;
      const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  }

  selectStopOver(stopOver: StepOverDetail) {
    this.selectedStopOver = stopOver;
    
    // Navigate to restaurants page with stop details
    this.router.navigate(['/restaurants'], {
      queryParams: { 
        bookingId: this.bookingId,
        stopId: stopOver.id,
        stopName: stopOver.name
      },
      state: {
        bookingDetails: this.bookingDetails,
        selectedStop: stopOver
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  retryLoad() {
    this.loadBookingDetails();
  }
}

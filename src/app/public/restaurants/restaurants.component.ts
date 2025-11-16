import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, timeout, retry } from 'rxjs/operators';
import { of, Subscription, throwError } from 'rxjs';
import { FoodOrderService } from '../../service/food-order.service';
import { environment } from '../../../environments/environment';

interface StepoverRestaurantsApiResponse {
  success: boolean;
  message: string;
  data: {
    stepOver: {
      id: number;
      name: string;
      code: string;
      arrivalTime: string;
      stopDuration: string;
    };
    restaurants: any[]; // The C# restaurant DTOs
    totalCount: number;
  };
  timestamp: string;
}

// Booking interfaces from stop-overs component
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

// Restaurant interfaces
interface RestaurantDetail {
  id: number;
  name: string;
  cuisine: string;
  image: string;
  rating: number;
  deliveryTime: number;
  priceRange: string;
  distance: string;
  isVeg: boolean;
  isFastFood: boolean;
  isRecommended: boolean;
  discount?: number;
  popularItems: string[];
  availableAtStop: boolean;
  address: string;
  phone: string;
  openingHours: string;
  specialOffers?: string[];

  // Additional fields from API
  tenantCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactMobile?: string;
  alternatePhone?: string;
  website?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  brandColor?: string;
  businessType?: string;
  currency?: string;
  language?: string;
  isActive?: boolean;
  isVerified?: boolean;
  takeOrders?: boolean;
  notes?: string;
  featuresEnabled?: string;
  timezone?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

@Component({
  selector: 'app-restaurants',
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurants.component.html',
  styleUrl: './restaurants.component.scss'
})
export class RestaurantsComponent implements OnInit, OnDestroy {
  private subscription = new Subscription();

  // Booking data
  selectedStop: any = {};
  bookingDetails: CompleteBookingResponse | null = null;
  restaurants: RestaurantDetail[] = [];
  filteredRestaurants: RestaurantDetail[] = [];
  searchQuery: string = '';
  selectedFilter: string = 'all';
  sortBy: string = 'recommended';

  // Loading and error states
  isLoadingBooking: boolean = false;
  isLoadingRestaurants: boolean = false;
  isLoadingBookingDetails: boolean = false;
  bookingError: string = '';
  restaurantsError: string = '';
  bookingDetailsError: string = '';

  // URL parameters
  bookingId: string = '';
  stopId: string = '';
  stopName: string = '';

  // FIXED API endpoints to match C# controller
  private readonly API_BASE_URL = environment.apiBaseUrl;
  private readonly RESTAURANTS_ENDPOINT = '/restaurant/stepover'; // ✅ FIXED: Changed from /booking/restaurants
  private readonly BOOKING_DETAILS_ENDPOINT = '/search/booking';

  // Computed properties for booking details
  get fromLocation(): string {
    return this.bookingDetails?.startLocation?.name || 'Loading...';
  }

  get toLocation(): string {
    return this.bookingDetails?.endLocation?.name || 'Loading...';
  }

  get departureDate(): string {
    return this.bookingDetails?.departureDate || '';
  }

  get departureTime(): string {
    return this.bookingDetails?.departureTime || '';
  }

  get formattedDate(): string {
    if (!this.departureDate) return 'Date TBD';
    try {
      const date = new Date(this.departureDate);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  }

  get stopOvers(): StepOverDetail[] {
    return this.bookingDetails?.stepOvers || [];
  }

  get busInfo(): string {
    if (!this.bookingDetails) return 'Bus information loading...';
    return `${this.bookingDetails.busName} (${this.bookingDetails.busNumber})`;
  }

  get currentStopDetails(): StepOverDetail | null {
    if (!this.stopId || !this.stopOvers.length) return null;
    return this.stopOvers.find(stop => stop.id.toString() === this.stopId.toString()) || null;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private foodOrderService: FoodOrderService
  ) { }

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private initializeComponent() {
    // Get URL parameters
    const paramsSub = this.route.queryParams.subscribe(params => {
      this.bookingId = params['bookingId'] || '';
      this.stopId = params['stopId'] || '';
      this.stopName = params['stopName'] || '';

      console.log('Restaurant component initialized with:', {
        bookingId: this.bookingId,
        stopId: this.stopId,
        stopName: this.stopName
      });

      // Load booking details first, then restaurants
      if (this.bookingId) {
        this.loadBookingDetails().then(() => {
          if (this.stopId) {
            this.callRestaurantsDetailsAPI();
          }
        }).catch(() => {
          // Even if booking details fail, try to load restaurants
          if (this.stopId) {
            this.callRestaurantsDetailsAPI();
          } else {
            this.loadDefaultRestaurants();
          }
        });
      } else {
        // If no booking ID, still try to load restaurants if we have stopId
        if (this.stopId) {
          this.callRestaurantsDetailsAPI();
        } else {
          this.loadDefaultRestaurants();
        }
      }
    });

    this.subscription.add(paramsSub);

    // Get navigation state data
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    if (navigationState) {
      this.bookingDetails = navigationState['bookingDetails'] || this.bookingDetails;
      this.selectedStop = navigationState['selectedStop'] || {};
      console.log('Received navigation state:', { bookingDetails: this.bookingDetails, selectedStop: this.selectedStop });
    }

    // Get current order data from service
    const orderSub = this.foodOrderService.orderData$.subscribe(data => {
      this.selectedStop = data.stopOver || this.selectedStop;
      if (data.bookingDetails && !this.bookingDetails) {
        this.bookingDetails = data.bookingDetails;
      }
    });

    this.subscription.add(orderSub);
  }
  toggleVegFilter() {
    this.selectedFilter = this.selectedFilter === 'veg' ? 'all' : 'veg';
    this.filterRestaurants();
  }
  getRestaurantImage(restaurant: any): string {
    const baseUrl = environment.apiUrl;

    if (restaurant.logoUrl) {
      // If logoUrl starts with http, use it directly
      if (restaurant.logoUrl.startsWith('http')) {
        return restaurant.logoUrl;
      }
      // Otherwise, prepend base URL
      return `${baseUrl}${restaurant.logoUrl}`;
    }

    // Fallback to default food image based on restaurant type
    return this.getDefaultFoodImage(restaurant.tenantName || restaurant.name);
  }
  private getDefaultFoodImage(restaurantName?: string): string {
    if (!restaurantName) return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600';

    const name = restaurantName.toLowerCase();
    if (name.includes('spice') || name.includes('indian'))
      return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=600';
    if (name.includes('ocean') || name.includes('sea'))
      return 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=600';
    if (name.includes('pizza'))
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600';
    if (name.includes('burger'))
      return 'https://images.unsplash.com/photo-1552566120-d1c35e522f20?w=600';
    if (name.includes('coffee') || name.includes('cafe'))
      return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600';

    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600';
  }



  // Load booking details method
  private loadBookingDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bookingId) {
        resolve();
        return;
      }

      // If booking details already exist from navigation state, don't reload
      if (this.bookingDetails) {
        console.log('Using existing booking details from navigation state');
        resolve();
        return;
      }

      this.isLoadingBookingDetails = true;
      this.bookingDetailsError = '';

      console.log(`Loading booking details for ID: ${this.bookingId}`);

      const detailsSub = this.http.get<ApiResponse<CompleteBookingResponse>>(
        `${this.API_BASE_URL}${this.BOOKING_DETAILS_ENDPOINT}/${this.bookingId}/details`
      ).pipe(
        timeout(30000),
        retry({
          count: 2,
          delay: 2000
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error loading booking details:', error);
          this.bookingDetailsError = this.getDetailedErrorMessage(error);
          return throwError(() => error);
        }),
        finalize(() => {
          this.isLoadingBookingDetails = false;
        })
      ).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.bookingDetails = response.data;
            console.log('Booking details loaded:', this.bookingDetails);

            // Update selected stop from booking details if we have the stop ID
            if (this.stopId && this.stopOvers.length > 0) {
              const foundStop = this.stopOvers.find(stop => stop.id.toString() === this.stopId.toString());
              if (foundStop) {
                this.selectedStop = { ...this.selectedStop, ...foundStop };
                this.stopName = foundStop.name;
              }
            }
            resolve();
          } else {
            this.bookingDetailsError = response.message || 'No booking data found';
            reject(new Error(this.bookingDetailsError));
          }
        },
        error: (error) => {
          reject(error);
        }
      });

      this.subscription.add(detailsSub);
    });
  }

  // ✅ FIXED: Updated API call method
  private callRestaurantsDetailsAPI() {
    // Check if we have minimum required data
    if (!this.stopId) {
      this.bookingError = 'Missing stop ID';
      this.loadDefaultRestaurants();
      return;
    }

    this.isLoadingBooking = true;
    this.bookingError = '';

    console.log(`Fetching restaurants for stepover ${this.stopId}`);

    // Updated payload to match C# API
    const payload = {
      stepoverId: parseInt(this.stopId), // Convert to number
      bookingId: this.bookingId || null, // Allow null booking ID
      userId: this.bookingDetails?.createdAt || null,
      routeId: this.bookingDetails?.route?.routeId || null
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // ✅ FIXED: Using correct endpoint
    const apiUrl = `${this.API_BASE_URL}${this.RESTAURANTS_ENDPOINT}`;
    console.log('Calling restaurants API:', apiUrl, 'with payload:', payload);

    const apiSub = this.http.post<StepoverRestaurantsApiResponse>(apiUrl, payload, { headers })
      .pipe(
        timeout(30000),
        retry({
          count: 2,
          delay: 2000
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Restaurants API error:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          this.bookingError = this.getDetailedErrorMessage(error);
          return of({
            success: false,
            message: 'Failed to load restaurants',
            data: {
              stepOver: null,
              restaurants: [],
              totalCount: 0
            },
            timestamp: new Date().toISOString()
          });
        }),
        finalize(() => {
          this.isLoadingBooking = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Restaurants API response:', response);

          if (response && response.success && response.data && response.data.restaurants) {
            // Map C# restaurant response to your existing restaurant interface
            this.restaurants = response.data.restaurants.map((restaurant) => this.mapCSharpRestaurantToLocal(restaurant));
            this.filteredRestaurants = [...this.restaurants];

            // Update stop details from API response
            if (response.data.stepOver) {
              this.selectedStop = {
                ...this.selectedStop,
                id: response.data.stepOver.id,
                name: response.data.stepOver.name,
                code: response.data.stepOver.code,
                arrivalTime: response.data.stepOver.arrivalTime,
                stopDuration: response.data.stepOver.stopDuration
              };
              // Update stop name if it was empty
              if (!this.stopName) {
                this.stopName = response.data.stepOver.name;
              }
            }

            this.sortRestaurants();
            console.log(`Loaded ${this.restaurants.length} restaurants from API`);

            // Clear any previous errors
            this.bookingError = '';
          } else {
            this.bookingError = response?.message || 'Failed to load restaurants for this stop';
            console.warn('API returned unsuccessful response:', response);
            // Load default restaurants as fallback
            this.loadDefaultRestaurants();
          }
        },
        error: (error) => {
          console.error('Subscription error:', error);
          this.loadDefaultRestaurants();
        }
      });

    this.subscription.add(apiSub);
  }
  getRestaurantLogo(restaurant: any): string {
    const baseUrl = environment.apiUrl;

    if (restaurant.logoUrl) {
      // If logoUrl starts with http, use it directly
      if (restaurant.logoUrl.startsWith('http')) {
        return restaurant.logoUrl;
      }
      // Otherwise, prepend base URL
      return `${baseUrl}${restaurant.logoUrl}`;
    }

    // Fallback to default image
    return this.getDefaultImage(restaurant.tenantName || restaurant.name);
  }

  // Handle logo error
  onLogoError(event: any, restaurant: any) {
    console.warn('Logo failed to load for restaurant:', restaurant.name);
    event.target.src = this.getDefaultImage(restaurant.tenantName || restaurant.name);
  }
  private determineIfVeg(tenantName?: string, businessType?: string, notes?: string): boolean {
    if (!tenantName && !businessType && !notes) return false;

    const vegKeywords = ['veg', 'vegetarian', 'pure veg', 'haldiram', 'saravana', 'temple', 'jain'];
    const searchText = `${tenantName || ''} ${businessType || ''} ${notes || ''}`.toLowerCase();

    return vegKeywords.some(keyword => searchText.includes(keyword));
  }
  getEnabledFeatures(featuresJson: string): string[] {
    try {
      const features = JSON.parse(featuresJson);
      return Object.keys(features).filter(key => features[key] === true);
    } catch {
      return [];
    }
  }

  // Get feature icon
  getFeatureIcon(feature: string): string {
    const iconMap: { [key: string]: string } = {
      'dinein': 'bi bi-house-door-fill',
      'delivery': 'bi bi-truck',
      'takeaway': 'bi bi-bag-fill',
      'online_ordering': 'bi bi-laptop'
    };
    return iconMap[feature] || 'bi bi-check-circle-fill';
  }

  // Get feature label
  getFeatureLabel(feature: string): string {
    const labelMap: { [key: string]: string } = {
      'dinein': 'Dine In',
      'delivery': 'Delivery',
      'takeaway': 'Takeaway',
      'online_ordering': 'Online Ordering'
    };
    return labelMap[feature] || feature.replace('_', ' ').toUpperCase();
  }

  // Get language label
  getLanguageLabel(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'bn': 'Bengali',
      'gu': 'Gujarati',
      'mr': 'Marathi',
      'pa': 'Punjabi'
    };
    return languageMap[languageCode] || languageCode.toUpperCase();
  }

  // Format date
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return 'N/A';
    }
  }

  // Generate popular items based on restaurant info
  private generatePopularItems(tenantName?: string, businessType?: string): string[] {
    if (!tenantName && !businessType) return ['House Special'];

    const name = (tenantName || '').toLowerCase();
    const type = (businessType || '').toLowerCase();

    if (name.includes('spice') || type.includes('indian')) {
      return ['Butter Chicken', 'Biryani', 'Naan', 'Dal Makhani'];
    }
    if (name.includes('ocean') || name.includes('sea')) {
      return ['Fish Curry', 'Prawns Fry', 'Crab Masala', 'Seafood Platter'];
    }
    if (type.includes('pizza')) {
      return ['Margherita', 'Pepperoni', 'Veggie Supreme'];
    }
    if (type.includes('cafe') || type.includes('coffee')) {
      return ['Cappuccino', 'Americano', 'Sandwich', 'Pastries'];
    }

    return ['Chef Special', 'Today\'s Special', 'House Combo'];
  }

  // Updated filter method (simplified)
  filterRestaurants() {
    let filtered = this.restaurants;

    // Only apply veg filter
    if (this.selectedFilter === 'veg') {
      filtered = filtered.filter(r => r.isVeg);
    }

    this.filteredRestaurants = filtered;
  }

  // Reset filters
  resetFilters() {
    this.selectedFilter = 'all';
    this.filterRestaurants();
  }
  // ✅ FIXED: Updated mapping method
  private mapCSharpRestaurantToLocal(csharpRestaurant: any): RestaurantDetail {
    console.log('Mapping restaurant:', csharpRestaurant);

    return {
      // Existing mapped fields
      id: csharpRestaurant.tenantId,
      name: csharpRestaurant.tenantName || 'Unknown Restaurant',
      cuisine: this.generateCuisineFromBusinessType(csharpRestaurant.businessType),
      image: this.getRestaurantLogo(csharpRestaurant),
      rating: csharpRestaurant.rating || 4.0,
      deliveryTime: csharpRestaurant.deliveryTime || 20,
      priceRange: csharpRestaurant.priceRange || '₹200',
      distance: csharpRestaurant.distance || '0.5 km',
      isVeg: this.determineIfVeg(csharpRestaurant.tenantName, csharpRestaurant.businessType, csharpRestaurant.notes),
      isFastFood: csharpRestaurant.isFastFood || true,
      isRecommended: csharpRestaurant.isRecommended || false,
      discount: csharpRestaurant.discount,
      popularItems: Array.isArray(csharpRestaurant.popularItems) ? csharpRestaurant.popularItems : this.generatePopularItems(csharpRestaurant.tenantName, csharpRestaurant.businessType),
      availableAtStop: true,
      address: csharpRestaurant.address || 'Near Bus Stop',
      phone: csharpRestaurant.contactPhone || csharpRestaurant.contactMobile || '+91-0000000000',
      openingHours: csharpRestaurant.openingHours || '9:00 AM - 9:00 PM',
      specialOffers: Array.isArray(csharpRestaurant.specialOffers) ? csharpRestaurant.specialOffers : undefined,

      // Additional fields from API response
      tenantCode: csharpRestaurant.tenantCode,
      contactName: csharpRestaurant.contactName,
      contactEmail: csharpRestaurant.contactEmail,
      contactPhone: csharpRestaurant.contactPhone,
      contactMobile: csharpRestaurant.contactMobile,
      alternatePhone: csharpRestaurant.alternatePhone,
      website: csharpRestaurant.website,
      city: csharpRestaurant.city,
      state: csharpRestaurant.state,
      postalCode: csharpRestaurant.postalCode,
      country: csharpRestaurant.country,
      latitude: csharpRestaurant.latitude,
      longitude: csharpRestaurant.longitude,
      logoUrl: csharpRestaurant.logoUrl,
      brandColor: csharpRestaurant.brandColor,
      businessType: csharpRestaurant.businessType,
      currency: csharpRestaurant.currency,
      language: csharpRestaurant.language,
      isActive: csharpRestaurant.isActive,
      isVerified: csharpRestaurant.isVerified,
      takeOrders: csharpRestaurant.takeOrders,
      notes: csharpRestaurant.notes,
      featuresEnabled: csharpRestaurant.featuresEnabled,
      timezone: csharpRestaurant.timezone,
      createdAt: csharpRestaurant.createdAt
    };
  }


  // Helper method to get default image based on restaurant name
  private getDefaultImage(restaurantName?: string): string {
    if (!restaurantName) return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400';

    const name = restaurantName.toLowerCase();
    if (name.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
    if (name.includes('burger') || name.includes('mcdonald')) return 'https://images.unsplash.com/photo-1552566120-d1c35e522f20?w=400';
    if (name.includes('coffee') || name.includes('cafe')) return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400';
    if (name.includes('haldiram') || name.includes('sweets')) return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400';

    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400';
  }

  // Helper method to generate cuisine from business type
  private generateCuisineFromBusinessType(businessType?: string): string {
    if (!businessType) return 'Multi-cuisine';

    const type = businessType.toLowerCase();

    if (type.includes('pizza')) return 'Pizza, Italian';
    if (type.includes('burger')) return 'Burgers, Fast Food';
    if (type.includes('coffee') || type.includes('cafe')) return 'Coffee, Beverages, Snacks';
    if (type.includes('veg')) return 'Vegetarian, North Indian';
    if (type.includes('fast')) return 'Fast Food, Quick Bites';
    if (type.includes('restaurant')) return 'Multi-cuisine, Restaurant';
    if (type.includes('sweet')) return 'Sweets, North Indian, Snacks';

    return 'Restaurant, Multi-cuisine';
  }

  // Enhanced error message handling
  private getDetailedErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Unable to connect to the server. Please check your internet connection and ensure the API server is running.';
      case 400:
        return 'Invalid request. Please check the stop ID and booking information.';
      case 401:
        return 'Authentication required. Please login again.';
      case 403:
        return 'Access denied. You don\'t have permission for this request.';
      case 404:
        return `Restaurant API endpoint not found. Please ensure the API server is running on ${this.API_BASE_URL}`;
      case 408:
        return 'Request timeout. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please check the API server logs and try again.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service maintenance in progress. Please try again later.';
      default:
        if (error.error?.message) {
          return `API Error: ${error.error.message}`;
        } else if (error.message) {
          return `Network Error: ${error.message}`;
        } else {
          return `Failed to load data (HTTP ${error.status})`;
        }
    }
  }

  // Retry methods
  retryBookingAPI() {
    this.callRestaurantsDetailsAPI();
  }

  retryBookingDetails() {
    this.loadBookingDetails().then(() => {
      if (this.stopId) {
        this.callRestaurantsDetailsAPI();
      }
    });
  }

  // Time calculation methods
  getCalculatedArrivalTime(stopOver?: StepOverDetail): string {
    const currentStop = stopOver || this.currentStopDetails;
    if (!currentStop || !this.departureTime) return 'TBD';

    try {
      const [depHours, depMinutes] = this.departureTime.split(':').map(Number);
      const departureTimeMinutes = depHours * 60 + depMinutes;

      const distanceToStop = currentStop.distance;
      const travelTimeMinutes = Math.round(distanceToStop / 50 * 60);
      const bufferTime = (currentStop.stopOrder - 1) * 15;

      const arrivalTimeMinutes = departureTimeMinutes + travelTimeMinutes + bufferTime;
      const arrivalHours = Math.floor(arrivalTimeMinutes / 60) % 24;
      const arrivalMins = arrivalTimeMinutes % 60;

      const hour12 = arrivalHours % 12 || 12;
      const ampm = arrivalHours >= 12 ? 'PM' : 'AM';

      return `${hour12}:${arrivalMins.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      console.error('Error calculating arrival time:', error);
      return 'TBD';
    }
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

  // Load default restaurants (enhanced with more debug info)
  loadDefaultRestaurants() {
    this.isLoadingRestaurants = true;

    console.log('Loading default restaurants as fallback');

    setTimeout(() => {
      this.restaurants = [
        {
          id: 1,
          name: 'Subway',
          cuisine: 'Sandwiches, Fast Food, Healthy',
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
          rating: 4.2,
          deliveryTime: 15,
          priceRange: '₹150',
          distance: '0.2 km',
          isVeg: false,
          isFastFood: true,
          isRecommended: true,
          discount: 20,
          popularItems: ['Italian BMT', 'Veggie Delite', 'Chicken Teriyaki'],
          availableAtStop: true,
          address: 'Near Bus Stop',
          phone: '+91-9876543210',
          openingHours: '6:00 AM - 11:00 PM'
        },
        {
          id: 2,
          name: 'McDonald\'s',
          cuisine: 'Burgers, Fast Food, Beverages',
          image: 'https://images.unsplash.com/photo-1552566120-d1c35e522f20?w=400',
          rating: 4.1,
          deliveryTime: 12,
          priceRange: '₹200',
          distance: '0.1 km',
          isVeg: false,
          isFastFood: true,
          isRecommended: false,
          discount: 15,
          popularItems: ['Big Mac', 'McChicken', 'French Fries'],
          availableAtStop: true,
          address: 'Bus Terminal Food Court',
          phone: '+91-9876543211',
          openingHours: '24/7'
        },
        {
          id: 3,
          name: 'Haldiram\'s',
          cuisine: 'North Indian, Sweets, Snacks',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
          rating: 4.5,
          deliveryTime: 18,
          priceRange: '₹120',
          distance: '0.3 km',
          isVeg: true,
          isFastFood: false,
          isRecommended: true,
          popularItems: ['Chole Bhature', 'Samosa', 'Rasgulla'],
          availableAtStop: true,
          address: 'Main Road',
          phone: '+91-9876543212',
          openingHours: '7:00 AM - 10:00 PM'
        }
      ];

      if (!this.isLoadingBooking) {
        this.filteredRestaurants = [...this.restaurants];
        this.sortRestaurants();
      }
      this.isLoadingRestaurants = false;
      console.log('Default restaurants loaded');
    }, 1000);
  }



  sortRestaurants() {
    switch (this.sortBy) {
      case 'rating':
        this.filteredRestaurants.sort((a, b) => b.rating - a.rating);
        break;
      case 'delivery':
        this.filteredRestaurants.sort((a, b) => a.deliveryTime - b.deliveryTime);
        break;
      case 'price':
        this.filteredRestaurants.sort((a, b) =>
          parseInt(a.priceRange.replace('₹', '')) - parseInt(b.priceRange.replace('₹', ''))
        );
        break;
      default:
        this.filteredRestaurants.sort((a, b) =>
          (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0)
        );
    }
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
    this.filterRestaurants();
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterRestaurants();
  }



  onImageError(event: any, restaurant: any) {
    console.warn('Image failed to load for restaurant:', restaurant.name);
    event.target.src = this.getDefaultFoodImage(restaurant.tenantName || restaurant.name);
  }

  selectRestaurant(restaurant: RestaurantDetail) {
    const orderSub = this.foodOrderService.orderData$.subscribe(currentData => {
      const updatedData = {
        ...currentData,
        restaurant: restaurant,
        bookingDetails: this.bookingDetails,
        bookingContext: {
          bookingId: this.bookingId,
          stopOverId: this.stopId,
          stopOverName: this.stopName
        }
      };
      this.foodOrderService.setOrderData(updatedData);
    });

    this.subscription.add(orderSub);

    this.router.navigate(['/menu'], {
      queryParams: {
        restaurantId: restaurant.tenantCode,
        bookingId: this.bookingId,
        stopOverId: this.stopId
      }
    });
  }

  goBack() {
    this.router.navigate(['/stop-overs'], {
      queryParams: { bookingId: this.bookingId }
    });
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

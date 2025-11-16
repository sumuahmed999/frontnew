// components/order-status/order-status.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import {  OrderTrackingService, 
  OrderTrackingData, 
  OrderStatusUpdate  } from '../../service/order-tracking.service';
import { LocationTrackingService, LocationData } from '../../service/location-tracking.service';
import { environment } from '../../../environments/environment';
 
interface OrderStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'completed' | 'active' | 'pending';
  time?: string;
}

interface CreateOrderRatingRequest {
  bookingId: string;
  orderId: string;
  foodQualityRating: number;
  deliveryServiceRating: number;
  comments: string;
}

interface CreateOrderRatingResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Component({
  selector: 'app-order-status',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './order-status.component.html',
  styleUrl: './order-status.component.scss'
})
export class OrderStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Route params
  bookingId: string = '';
  tenantId: number = 0;
  
  // Display data
  orderId: string = '';
  busNumber: string = '';
  busName: string = '';
  startLocation: string = '';
  endLocation: string = '';
  currentStatus: string = 'confirmed';
  passengerPhone: string = '';
  orderItems: { name: string; quantity: number; price: number }[] = [];
  
  // Amount breakdown
  subtotal: number = 0;
  cgst: number = 0;
  sgst: number = 0;
  taxAmount: number = 0;
  deliveryFee: number = 0;
  originalAmount: number = 0;
  discountAmount: number = 0;
  totalAmount: number = 0;
  promoCode: string = '';
  
  // Status
  cancelReason: string = '';
  rejectReason: string = '';
  
  // Delivery person info
  deliveryPersonName: string = '';
  deliveryPersonPhone: string = '';
  assignedAt: string = '';
  
  // Location tracking
  userCurrentLocation: string = 'Getting location...';
  distanceToStop: string = '';
  estimatedArrival: string = '';
  stopName: string = '';
  
  // Loading states
  isLoading: boolean = true;
  isRefreshing: boolean = false;
  loadError: string = '';
  isConnected: boolean = false;
  
  // Location tracking
  isLocationSharing: boolean = false;
  locationError: string = '';
  currentLatitude: number = 0;
  currentLongitude: number = 0;
  
  // Feedback
  foodRating: number = 0;
  deliveryRating: number = 0;
  feedbackText: string = '';
  isSubmittingFeedback: boolean = false;
  feedbackSubmitted: boolean = false;
  
  // Order steps
  orderSteps: OrderStep[] = [
    {
      id: 'confirmed',
      title: 'Order Confirmed',
      description: 'Your order has been placed successfully',
      icon: 'bi-check-circle-fill',
      status: 'pending'
    },
    {
      id: 'preparing',
      title: 'Preparing Food',
      description: 'Restaurant is preparing your meal',
      icon: 'bi-clock-fill',
      status: 'pending'
    },
    {
      id: 'ready',
      title: 'Food Ready',
      description: 'Your order is ready for pickup',
      icon: 'bi-bag-check-fill',
      status: 'pending'
    },
    {
      id: 'completed',
      title: 'Order Complete',
      description: 'Enjoy your meal!',
      icon: 'bi-star-fill',
      status: 'pending'
    }
  ];

  private readonly RATING_API_URL = `${environment.apiBaseUrl}/OrderRating`;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private orderTrackingService: OrderTrackingService,
    private locationTrackingService: LocationTrackingService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    console.log('🚀 OrderStatusComponent initializing...');
    
    // Get booking ID from route
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(async params => {
        this.bookingId = params['bookingId'] || '';
        this.orderId = params['orderId'] || '';
        
        console.log('📋 Booking ID:', this.bookingId);
        
        if (this.bookingId) {
          await this.initializeOrderTracking();
        } else {
          this.loadError = 'Booking ID not provided';
          this.isLoading = false;
        }
      });

    // Monitor connection state
    this.orderTrackingService.getConnectionState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isConnected => {
        this.isConnected = isConnected;
        console.log('📡 SignalR Connection:', isConnected ? 'Connected' : 'Disconnected');
      });

    // Subscribe to status updates
    this.orderTrackingService.getOrderStatusUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        if (update && update.bookingId === this.bookingId) {
          console.log('🔔 Status update:', update);
          this.handleStatusUpdate(update);
        }
      });

    // Subscribe to location sharing state
    this.locationTrackingService.getLocationSharingState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isSharing => {
        this.isLocationSharing = isSharing;
        console.log('📍 Location sharing:', isSharing ? 'Active' : 'Inactive');
      });

    // Subscribe to current location updates
    this.locationTrackingService.getCurrentLocation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(location => {
        if (location) {
          this.currentLatitude = location.latitude;
          this.currentLongitude = location.longitude;
          this.userCurrentLocation = `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`;
          console.log('📍 Location updated:', this.userCurrentLocation);
        }
      });

    this.getCurrentLocation();
  }

  ngOnDestroy() {
    console.log('🛑 Component destroying');
    
    if (this.bookingId) {
      this.orderTrackingService.leaveBookingGroup(this.bookingId);
      
      // Stop location sharing
      if (this.isLocationSharing) {
        this.locationTrackingService.stopLocationSharing(this.bookingId, this.tenantId);
      }
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize order tracking
   */
  private async initializeOrderTracking() {
    try {
      console.log('🔧 Initializing order tracking...');
      
      // Start SignalR connection
      await this.orderTrackingService.startConnection();
      
      // Join booking group
      await this.orderTrackingService.joinBookingGroup(this.bookingId);
      
      // Load order data
      this.loadOrderTracking();
    } catch (error) {
      console.error('❌ Error initializing:', error);
      this.loadError = 'Failed to connect. Click retry to try again.';
      this.isLoading = false;
    }
  }

  /**
   * Load order tracking data
   */
  private loadOrderTracking() {
    if (!this.bookingId) return;

    this.isLoading = true;
    this.loadError = '';

    this.orderTrackingService.getOrderTracking(this.bookingId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Order loaded:', response);
          
          if (response.success && response.data) {
            this.populateOrderData(response.data);
          } else {
            this.loadError = response.message || 'Failed to load order';
          }
        },
        error: (error) => {
          console.error('❌ Error loading order:', error);
          this.loadError = error.message || 'Failed to load order. Click retry to try again.';
        }
      });
  }

  /**
   * Populate order data
   */
  private populateOrderData(data: OrderTrackingData) {
    this.orderId = data.orderId;
    this.busNumber = data.busNumber;
    this.busName = data.busName;
    this.startLocation = data.startLocation;
    this.endLocation = data.endLocation;
    this.passengerPhone = data.passengerPhone;
    
    // Extract tenantId from the data if available
    if (data.tenantId) {
      this.tenantId = data.tenantId;
    } else {
      // Fallback to localStorage
      const storedTenantId = localStorage.getItem('tenantId');
      if (storedTenantId) {
        this.tenantId = parseInt(storedTenantId, 10);
      }
    }
    // Normalize status: treat 'delivered' as 'completed'
    const rawStatus = data.currentStatus.toLowerCase();
    this.currentStatus = rawStatus === 'delivered' ? 'completed' : rawStatus;
    
    this.subtotal = data.subtotal || 0;
    this.cgst = data.cgst || 0;
    this.sgst = data.sgst || 0;
    this.taxAmount = data.taxAmount || 0;
    this.deliveryFee = data.deliveryFee || 0;
    this.originalAmount = data.originalAmount || 0;
    this.discountAmount = data.discountAmount || 0;
    this.totalAmount = data.totalAmount || 0;
    this.promoCode = data.promoCode || '';
    
    this.cancelReason = data.cancelReason || '';
    this.rejectReason = data.rejectReason || '';
    
    // Delivery person info
    this.deliveryPersonName = data.deliveryPersonName || '';
    this.deliveryPersonPhone = data.deliveryPersonPhone || '';
    this.assignedAt = data.assignedAt || '';
    
    this.stopName = data.startLocation;
    
    this.orderItems = data.items.map(item => ({
      name: item.itemName,
      quantity: item.quantity,
      price: (item.discountedPrice || item.price) * item.quantity
    }));

    this.updateOrderStepsFromStatus(this.currentStatus, data.statusHistory);

    // Check if order has been rated (only for completed orders)
    if (this.currentStatus === 'completed') {
      this.checkIfRated();
    }

    // Auto-start location sharing for active orders
    if (this.shouldShareLocation() && !this.isLocationSharing) {
      this.startLocationSharing();
    }

    console.log('✅ Order data populated');
  }

  /**
   * Check if location should be shared based on order status
   */
  private shouldShareLocation(): boolean {
    const activeStatuses = ['confirmed', 'preparing', 'ready'];
    return activeStatuses.includes(this.currentStatus.toLowerCase()) && this.tenantId > 0;
  }

  /**
   * Start location sharing
   */
  async startLocationSharing() {
    if (!this.bookingId || !this.tenantId) {
      console.warn('⚠️ Cannot start location sharing: missing bookingId or tenantId');
      return;
    }

    try {
      this.locationError = '';
      await this.locationTrackingService.startLocationSharing(this.bookingId, this.tenantId);
      console.log('✅ Location sharing started successfully');
    } catch (error: any) {
      console.error('❌ Failed to start location sharing:', error);
      this.locationError = error.message || 'Failed to start location sharing';
    }
  }

  /**
   * Stop location sharing
   */
  async stopLocationSharing() {
    try {
      await this.locationTrackingService.stopLocationSharing(this.bookingId, this.tenantId);
      console.log('✅ Location sharing stopped');
    } catch (error) {
      console.error('❌ Failed to stop location sharing:', error);
    }
  }

  /**
   * Handle status update
   */
  private handleStatusUpdate(update: OrderStatusUpdate) {
    console.log('🔄 Handling status update:', update.status);
    
    // Normalize status: treat 'delivered' as 'completed'
    const rawStatus = update.status.toLowerCase();
    this.currentStatus = rawStatus === 'delivered' ? 'completed' : rawStatus;
    
    // Update the specific step with the new timestamp
    const stepIndex = this.orderSteps.findIndex(s => s.id === this.currentStatus);
    if (stepIndex !== -1) {
      this.orderSteps[stepIndex].status = 'active';
      this.orderSteps[stepIndex].time = this.formatTime(update.updatedAt);
      
      // Mark previous steps as completed
      for (let i = 0; i < stepIndex; i++) {
        if (this.orderSteps[i].status !== 'completed') {
          this.orderSteps[i].status = 'completed';
          if (!this.orderSteps[i].time) {
            this.orderSteps[i].time = this.formatTime(update.updatedAt);
          }
        }
      }
    }
    
    if (update.details) {
      if (update.details.cancelReason) {
        this.cancelReason = update.details.cancelReason;
      }
      if (update.details.rejectReason) {
        this.rejectReason = update.details.rejectReason;
      }
      if (update.details.deliveryPerson) {
        this.deliveryPersonName = update.details.deliveryPerson.name;
        this.deliveryPersonPhone = update.details.deliveryPerson.phone;
        console.log('✅ Delivery person assigned:', this.deliveryPersonName);
      }
    }
    
    // Stop location sharing if order is completed, canceled, or rejected
    if (['completed', 'canceled', 'rejected'].includes(this.currentStatus.toLowerCase())) {
      if (this.isLocationSharing) {
        this.stopLocationSharing();
      }
    }
  }

  /**
   * Update order steps
   */
  private updateOrderStepsFromStatus(currentStatus: string, history: any[]) {
    const status = currentStatus.toLowerCase();
    
    // For canceled/rejected orders, show history for completed steps
    if (status === 'canceled' || status === 'rejected') {
      this.orderSteps.forEach((step) => {
        const historyItem = history?.find(h => h.status.toLowerCase() === step.id);
        step.status = historyItem ? 'completed' : 'pending';
        step.time = historyItem ? this.formatTime(historyItem.timestamp) : undefined;
      });
      return;
    }

    // For active orders, use history to show timestamps
    const statusOrder = ['confirmed', 'preparing', 'ready', 'completed'];
    const currentIndex = statusOrder.indexOf(status);

    this.orderSteps.forEach((step, index) => {
      // Find the history item for this step (handle 'delivered' as 'completed')
      let historyItem = history?.find(h => h.status.toLowerCase() === step.id);
      if (!historyItem && step.id === 'completed') {
        historyItem = history?.find(h => h.status.toLowerCase() === 'delivered');
      }
      
      if (index < currentIndex) {
        // Completed steps - show with timestamp from history
        step.status = 'completed';
        step.time = historyItem ? this.formatTime(historyItem.timestamp) : undefined;
      } else if (index === currentIndex) {
        // Active step - show with timestamp from history or current time
        step.status = 'active';
        step.time = historyItem ? this.formatTime(historyItem.timestamp) : this.formatTime(new Date().toISOString());
      } else {
        // Pending steps - no timestamp
        step.status = 'pending';
        step.time = undefined;
      }
    });
  }

  // UI Methods
  async refreshStatus() {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    setTimeout(() => {
      this.loadOrderTracking();
      setTimeout(() => {
        this.isRefreshing = false;
      }, 1000);
    }, 500);
  }

  getCurrentLocation() {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            this.userCurrentLocation = 'NH-44, Near Milestone 45';
            this.distanceToStop = '8.5 km';
            this.estimatedArrival = '2:45 PM';
          },
          error => {
            console.error('Geolocation error:', error);
            this.userCurrentLocation = 'Location unavailable';
          }
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      this.userCurrentLocation = 'Location access denied';
    }
  }

  updateLocation() {
    this.userCurrentLocation = 'Getting location...';
    this.getCurrentLocation();
  }

  // Helper methods
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready': 'Ready',
      'completed': 'Completed',
      'canceled': 'Canceled',
      'rejected': 'Rejected'
    };
    return statusMap[status] || 'Processing';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'confirmed': 'success',
      'preparing': 'warning',
      'ready': 'info',
      'completed': 'completed',
      'canceled': 'canceled',
      'rejected': 'rejected'
    };
    return colorMap[status] || 'secondary';
  }

  isStatusCompleted(): boolean {
    return this.currentStatus === 'completed';
  }

  isStatusCanceled(): boolean {
    return this.currentStatus === 'canceled';
  }

  isStatusRejected(): boolean {
    return this.currentStatus === 'rejected';
  }

  hasTax(): boolean {
    return this.taxAmount > 0;
  }

  hasDeliveryFee(): boolean {
    return this.deliveryFee > 0;
  }

  hasDiscount(): boolean {
    return this.discountAmount > 0 && !!this.promoCode;
  }

  formatCurrency(amount: number): string {
    return isNaN(amount) ? '0.00' : amount.toFixed(2);
  }

  private formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '';
    }
  }

  callRestaurant() {
    if (this.busNumber) {
      window.location.href = `tel:${this.busNumber}`;
    }
  }

  callDeliveryPerson() {
    if (this.deliveryPersonPhone) {
      window.location.href = `tel:${this.deliveryPersonPhone}`;
    }
  }

  hasDeliveryPerson(): boolean {
    return !!this.deliveryPersonName && !!this.deliveryPersonPhone;
  }

  getFormattedAssignedTime(): string {
    if (!this.assignedAt) return '';
    return this.formatTime(this.assignedAt);
  }

  reportIssue() {
    alert('Opening support chat...');
  }

  retryLoad() {
    this.loadOrderTracking();
  }

  goBack() {
    this.router.navigate(['/order-confirmation'], {
      queryParams: { bookingId: this.bookingId }
    });
  }

  // Feedback methods
  setFoodRating(rating: number) {
    this.foodRating = rating;
  }

  setDeliveryRating(rating: number) {
    this.deliveryRating = rating;
  }

  async checkIfRated() {
    if (!this.bookingId) return;

    try {
      const response: any = await this.http.get(
        `${this.RATING_API_URL}/${this.bookingId}/check`
      ).toPromise();

      if (response?.success && response?.data?.hasRated) {
        this.feedbackSubmitted = true;
        console.log('Order has already been rated');
      }
    } catch (error) {
      console.error('Error checking rating status:', error);
    }
  }

  submitFeedback() {
    if (this.foodRating === 0 && this.deliveryRating === 0) {
      alert('Please provide at least one rating');
      return;
    }

    if (!this.passengerPhone) {
      alert('Passenger phone number is required');
      return;
    }

    this.isSubmittingFeedback = true;

    const request: CreateOrderRatingRequest = {
      bookingId: this.bookingId,
      orderId: this.orderId,
      foodQualityRating: this.foodRating,
      deliveryServiceRating: this.deliveryRating,
      comments: this.feedbackText.trim()
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Passenger-Phone': this.passengerPhone
    });

    this.http.post<CreateOrderRatingResponse>(
      `${this.RATING_API_URL}/submit`,
      request,
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Error submitting rating:', error);
        let errorMessage = 'Failed to submit rating. Please try again.';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        alert(errorMessage);
        this.isSubmittingFeedback = false;
        return of(null);
      })
    ).subscribe(response => {
      if (response && response.success) {
        console.log('✅ Rating submitted successfully:', response);
        this.isSubmittingFeedback = false;
        this.feedbackSubmitted = true;

        // Keep success message visible
        console.log('Thank you for your feedback!');
      } else if (response) {
        alert(response.message || 'Failed to submit rating');
        this.isSubmittingFeedback = false;
      }
    });
  }
}

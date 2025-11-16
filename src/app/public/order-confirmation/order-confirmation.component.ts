import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface BookingItem {
  ItemId: number;
  ItemName: string;
  CategoryId: number;
  CategoryName: string;
  SubcategoryId?: number;
  SubcategoryName?: string;
  Price: number;
  DiscountedPrice?: number;
  Quantity: number;
  SpecialInstructions?: string;
  AddedAt: string;
  UpdatedAt: string;
  Status: string;
}

interface LocationInfo {
  id: number;
  name: string;
}

interface RouteInfo {
  routeId: number;
  routeName: string;
  distanceKm: number;
  estimatedTime: string;
  isActive: boolean;
}

interface BookingDetailsResponse {
  bookNumber: string;
  bookingId: string;
  busNumber: string;
  busName: string;
  startLocation: LocationInfo;
  endLocation: LocationInfo;
  departureDate: string;
  departureTime: string;
  bookingStatus: string;
  paymentStatus: string;
  
  // Amount breakdown
  subtotal: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  
  // Promo code
  originalAmount: number;
  discountAmount: number;
  promoCode?: string;
  
  // Contact
  passengerPhone?: string;
  
  // Items
  bookimgItems?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Route
  route: RouteInfo;
  stepOvers: any[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

@Component({
  selector: 'app-order-confirmation',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.scss'
})
export class OrderConfirmationComponent implements OnInit {
  // API Configuration
  private readonly API_BASE_URL = environment.apiBaseUrl;
  
  // Route params
  bookingId: string = '';
  
  // Display data
  orderId: string = '';
  busNumber: string = '';
  busName: string = '';
  startLocation: string = '';
  endLocation: string = '';
  departureDate: string = '';
  departureTime: string = '';
  arrivalTime: string = '';
  readyTime: string = '';
  mobileNumber: string = '';
  bookingStatus: string = '';
  
  // Order items
  orderItems: BookingItem[] = [];
  
  // Amount breakdown
  subtotal: number = 0;
  cgst: number = 0;
  sgst: number = 0;
  taxAmount: number = 0;
  deliveryFee: number = 0;
  itemsTotal: number = 0;
  
  // Promo and total
  originalAmount: number = 0;
  discountAmount: number = 0;
  totalAmount: number = 0;
  promoCode: string = '';
  
  // Loading states
  isLoading: boolean = true;
  loadError: string = '';
  
  // Route info
  routeName: string = '';
  estimatedTime: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.bookingId = params['bookingId'] || '';
      
      // Optional params (will be overridden by API data if available)
      this.totalAmount = parseFloat(params['totalAmount']) || 0;
      this.originalAmount = parseFloat(params['originalAmount']) || 0;
      this.discountAmount = parseFloat(params['discountAmount']) || 0;
      this.promoCode = params['promoCode'] || '';
      this.mobileNumber = params['mobileNumber'] || '';
      
      console.log('Order Confirmation - Booking ID:', this.bookingId);
      
      if (this.bookingId) {
        this.loadBookingDetails();
      } else {
        this.loadError = 'Booking ID not provided';
        this.isLoading = false;
      }
    });
  }

  private loadBookingDetails() {
    if (!this.bookingId) {
      this.loadError = 'Invalid booking ID';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    const apiUrl = `${this.API_BASE_URL}/search/booking/${this.bookingId}/details`;

    console.log('Fetching booking details from:', apiUrl);

    this.http.get<ApiResponse<BookingDetailsResponse>>(apiUrl)
      .pipe(
        catchError(error => {
          console.error('Error loading booking details:', error);
          this.loadError = this.getErrorMessage(error);
          return of({
            success: false,
            message: 'Failed to load booking details'
          } as ApiResponse<BookingDetailsResponse>);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        console.log('Booking details API response:', response);
        
        if (response.success && response.data) {
          this.populateBookingData(response.data);
        } else {
          this.loadError = response.message || 'Failed to load booking details';
        }
      });
  }

  private populateBookingData(booking: BookingDetailsResponse) {
    console.log('Populating booking data:', booking);

    // Basic info
    this.orderId = booking.bookNumber || booking.bookingId.substring(0, 8).toUpperCase();
    this.bookingId = booking.bookingId;
    this.busNumber = booking.busNumber;
    this.busName = booking.busName;
    this.startLocation = booking.startLocation.name;
    this.endLocation = booking.endLocation.name;
    this.departureDate = booking.departureDate;
    this.departureTime = booking.departureTime;
    this.bookingStatus = booking.bookingStatus;
    
    // Amount breakdown from API
    this.subtotal = booking.subtotal || 0;
    this.cgst = booking.cgst || 0;
    this.sgst = booking.sgst || 0;
    this.taxAmount = booking.taxAmount || 0;
    this.deliveryFee = booking.deliveryFee || 0;
    this.originalAmount = booking.originalAmount || 0;
    this.discountAmount = booking.discountAmount || 0;
    this.totalAmount = booking.totalAmount || 0;
    this.promoCode = booking.promoCode || '';
    
    // Contact
    if (booking.passengerPhone) {
      this.mobileNumber = this.formatMobileNumber(booking.passengerPhone);
    } else if (this.mobileNumber) {
      this.mobileNumber = this.formatMobileNumber(this.mobileNumber);
    }
    
    // Route
    if (booking.route) {
      this.routeName = booking.route.routeName;
      this.estimatedTime = booking.route.estimatedTime;
    }
    
    // Parse booking items
    if (booking.bookimgItems) {
      try {
        console.log('Raw booking items JSON:', booking.bookimgItems);
        const parsedItems = JSON.parse(booking.bookimgItems);
        
        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          this.orderItems = parsedItems;
          console.log('Parsed order items:', this.orderItems);
          this.calculateItemsTotal();
        } else {
          console.warn('Parsed items is not a valid array');
          this.orderItems = [];
        }
      } catch (error) {
        console.error('Error parsing booking items JSON:', error);
        this.orderItems = [];
      }
    } else {
      console.warn('No booking items in response');
      this.orderItems = [];
    }
    
    // Calculate times
    this.calculateEstimatedTimes();
    
    console.log('Order confirmation data loaded:', {
      orderId: this.orderId,
      items: this.orderItems.length,
      subtotal: this.subtotal,
      cgst: this.cgst,
      sgst: this.sgst,
      tax: this.taxAmount,
      deliveryFee: this.deliveryFee,
      discount: this.discountAmount,
      total: this.totalAmount
    });
  }

  private calculateItemsTotal() {
    if (!this.orderItems || this.orderItems.length === 0) {
      this.itemsTotal = 0;
      return;
    }

    this.itemsTotal = this.orderItems.reduce((total, item) => {
      const price = item.DiscountedPrice || item.Price;
      const itemTotal = price * item.Quantity;
      return total + itemTotal;
    }, 0);

    console.log('Calculated items total:', this.itemsTotal);
  }

  private calculateEstimatedTimes() {
    if (!this.departureTime) {
      console.warn('No departure time available');
      return;
    }

    try {
      const [hours, minutes] = this.departureTime.split(':');
      const departureDateTime = new Date();
      departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Ready time: 15 minutes before departure
      const readyDateTime = new Date(departureDateTime);
      readyDateTime.setMinutes(readyDateTime.getMinutes() - 15);
      
      this.readyTime = this.formatTime(
        readyDateTime.getHours().toString().padStart(2, '0') + ':' + 
        readyDateTime.getMinutes().toString().padStart(2, '0')
      );
      
      this.arrivalTime = this.formatTime(this.departureTime);
      
      console.log('Calculated times:', {
        departureTime: this.departureTime,
        readyTime: this.readyTime,
        arrivalTime: this.arrivalTime
      });
    } catch (error) {
      console.error('Error calculating times:', error);
      this.readyTime = '';
      this.arrivalTime = '';
    }
  }

  private formatMobileNumber(phone: string): string {
    if (!phone) return '';
    
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `+91 ${digits.substring(0, 5)}****${digits.substring(8)}`;
    } else if (digits.length > 10) {
      const last10 = digits.slice(-10);
      return `+91 ${last10.substring(0, 5)}****${last10.substring(8)}`;
    }
    
    return phone;
  }

  private getErrorMessage(error: any): string {
    if (error.status === 404) {
      return 'Booking not found';
    } else if (error.status === 0) {
      return 'Unable to connect to server';
    } else if (error.status >= 500) {
      return 'Server error. Please try again later';
    } else if (error.error?.message) {
      return error.error.message;
    }
    return 'An unexpected error occurred';
  }

  formatTime(time: string): string {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const hour12 = hour % 12 || 12;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return time;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }

  formatCurrency(amount: number): string {
    if (isNaN(amount)) return '0.00';
    return amount.toFixed(2);
  }

  getItemTotal(item: BookingItem): number {
    const price = item.DiscountedPrice || item.Price;
    return price * item.Quantity;
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

  trackOrder() {
    this.router.navigate(['/order-status'], {
      queryParams: { 
        bookingId: this.bookingId,
        orderId: this.orderId
      }
    });
  }

  retryLoad() {
    this.loadBookingDetails();
  }
}

import { Component, OnInit, OnDestroy, ViewChildren, ElementRef, QueryList, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';


// ==================== INTERFACES ====================

interface PromoCodeState {
  code: string;
  isApplied: boolean;
  isValidating: boolean;
  validationMessage: string;
  discountAmount: number;
  finalAmount: number;
  promoTitle: string;
  usageId?: number;
}

interface AvailablePromoCode {
  code: string;
  title: string;
  description: string;
  promoCodeType: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number;
  minimumOrderAmount?: number;
  validUntil: string;
  firstOrderOnly: boolean;
}

interface BookingItemDto {
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
  bookimgItems?: string;
  totalAmount: number;
  createdAt: string;
  route: {
    routeId: number;
    routeName: string;
    distanceKm: number;
    estimatedTime: string;
    isActive: boolean;
  };
  stepOvers: any[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

interface TaxSettings {
  taxEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
}

interface DeliveryFeeSettings {
  enabled: boolean;
  amount: number;
  freeDeliveryThreshold: number;
}

interface SendOtpRequest {
  mobileNumber: string;
  bookingId: string;
}

interface SendOtpResponse {
  success: boolean;
  message: string;
  otpId?: string;
  passengerName?: string;
  passengerEmail?: string;
}

interface VerifyOtpRequest {
  mobileNumber: string;
  otp: string;
  bookingId: string;
  passengerName: string;
  passengerEmail?: string;
  additionalRemarks?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupAddress?: string;
  promoCodeUsageId?: number;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  taxAmount?: number;
  deliveryFee?: number;
  finalAmount?: number;
  tenantID?: number;
}

interface BookingCompletionResponse {
  bookingId: string;
  bookingStatus: string;
  mobileNumber: string;
  passengerName: string;
  passengerEmail?: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  deliveryFee?: number;
  totalAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  promoCodeApplied?: string;
  completedAt: string;
}

interface PassengerDetails {
  name: string;
  email: string;
  remarks: string;
  latitude: number;
  longitude: number;
  address: string;
}


@Component({
  selector: 'app-mobile-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mobile-verification.component.html',
  styleUrl: './mobile-verification.component.scss'
})
export class MobileVerificationComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  private destroy$ = new Subject<void>();

  // API configuration
  private readonly API_BASE_URL = environment.apiBaseUrl;
  private readonly BOOKING_ENDPOINT = '/search/booking';
  private readonly OTP_ENDPOINT = '/auth';
  private readonly PROMOCODE_ENDPOINT = '/promocode';

  // Current step - NOW ONLY TWO STEPS
  currentStep: 'mobile' | 'otp' = 'mobile';
  
  // Mobile and OTP
  mobileNumber: string = '';
  otp1: string = '';
  otp2: string = '';
  otp3: string = '';
  otp4: string = '';
  resendTimer: number = 0;
  private resendInterval: any;
  private otpId: string = '';
  
  // Passenger details
  passengerDetails: PassengerDetails = {
    name: '',
    email: '',
    remarks: '',
    latitude: 0,
    longitude: 0,
    address: ''
  };
  
  isGettingLocation: boolean = false;
  locationError: string = '';
  
  // Route params
  bookingId: string = '';
  restaurantId: number = 0;
  
  // Booking details
  bookingDetails: CompleteBookingResponse | null = null;
  bookingItems: BookingItemDto[] = [];
  
  // Order summary
  cartItemsCount: number = 0;
  itemsTotal: number = 0;
  subtotal: number = 0;
  cgstAmount: number = 0;
  sgstAmount: number = 0;
  totalTaxAmount: number = 0;
  deliveryFee: number = 0;
  totalAmount: number = 0;
  originalTotalAmount: number = 0;
  
  // Loading states
  isLoading: boolean = false;
  isLoadingBooking: boolean = true;
  bookingError: string = '';
  
  // Settings
  taxSettings: TaxSettings = {
    taxEnabled: true,
    cgstRate: 9,
    sgstRate: 9
  };

  deliveryFeeSettings: DeliveryFeeSettings = {
    enabled: false,
    amount: 0,
    freeDeliveryThreshold: 500
  };

  // Promo code
  promoCodeState: PromoCodeState = {
    code: '',
    isApplied: false,
    isValidating: false,
    validationMessage: '',
    discountAmount: 0,
    finalAmount: 0,
    promoTitle: '',
    usageId: undefined
  };

  availablePromoCodes: AvailablePromoCode[] = [];
  showPromoCodeInput: boolean = false;
  showAvailablePromoCodes: boolean = false;
  isLoadingPromoCodes: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.bookingId = params['bookingId'] || '';
      this.restaurantId = parseInt(params['restaurantId']) || 0;
      
      console.log('Mobile Verification - Booking ID:', this.bookingId, 'Restaurant ID:', this.restaurantId);
      
      if (this.bookingId) {
        this.loadBookingDetails();
      } else {
        this.bookingError = 'Booking ID not provided';
        this.isLoadingBooking = false;
      }
    });

    // Get location immediately on init
    this.getCurrentLocation();
  }

  ngAfterViewInit() {
    if (this.currentStep === 'otp') {
      setTimeout(() => this.focusFirstInput(), 100);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resendInterval) clearInterval(this.resendInterval);
  }

  // ==================== LOCATION ====================

  getCurrentLocation() {
    this.isGettingLocation = true;
    this.locationError = '';

    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser';
      this.isGettingLocation = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.passengerDetails.latitude = position.coords.latitude;
        this.passengerDetails.longitude = position.coords.longitude;
        this.getAddressFromCoordinates(position.coords.latitude, position.coords.longitude);
        this.isGettingLocation = false;
        console.log('Location captured:', position.coords);
      },
      (error) => {
        this.locationError = this.getLocationErrorMessage(error);
        this.isGettingLocation = false;
        console.warn('Location error:', error);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  }

  private async getAddressFromCoordinates(lat: number, lng: number) {
    try {
      // Using OpenStreetMap's Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        this.passengerDetails.address = data.display_name;
        console.log('Address resolved:', this.passengerDetails.address);
      } else {
        this.passengerDetails.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      this.passengerDetails.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  private getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out.';
      default:
        return 'An unknown error occurred while getting location.';
    }
  }

  // ==================== BOOKING ====================

  public loadBookingDetails() {
    if (!this.bookingId) return;

    this.isLoadingBooking = true;
    this.bookingError = '';

    this.http.get<ApiResponse<CompleteBookingResponse>>(
      `${this.API_BASE_URL}${this.BOOKING_ENDPOINT}/${this.bookingId}/details`
    )
      .pipe(
        catchError(error => {
          this.bookingError = this.getErrorMessage(error);
          return of({ 
            success: false, 
            message: 'Failed to load booking details' 
          } as ApiResponse<CompleteBookingResponse>);
        }),
        finalize(() => this.isLoadingBooking = false)
      )
      .subscribe(response => {
        if (response.success && response.data) {
          this.bookingDetails = response.data;
          
          // Check if booking already confirmed
          if (this.shouldRedirectToOrderStatus(response.data.bookingStatus)) {
            this.redirectToOrderStatus();
            return;
          }
          
          // Parse booking items
          if (response.data.bookimgItems) {
            try {
              this.bookingItems = JSON.parse(response.data.bookimgItems);
              if (Array.isArray(this.bookingItems) && this.bookingItems.length > 0) {
                this.calculateOrderSummary();
                this.loadAvailablePromoCodes();
              } else {
                this.setDefaultValues();
              }
            } catch (error) {
              console.error('Error parsing booking items:', error);
              this.setDefaultValues();
            }
          } else {
            this.setDefaultValues();
          }
        } else {
          this.bookingError = response.message || 'Failed to load booking details';
          this.setDefaultValues();
        }
      });
  }

  private shouldRedirectToOrderStatus(bookingStatus: string): boolean {
    const confirmedStatuses = [
      'confirmed', 'preparing', 'ready', 'completed', 
      'delivered', 'canceled', 'cancelled', 'rejected'
    ];
    return confirmedStatuses.includes(bookingStatus.toLowerCase());
  }

  private redirectToOrderStatus() {
    this.bookingError = 'This order has already been confirmed. Redirecting...';
    setTimeout(() => {
      this.router.navigate(['/order-status'], { 
        queryParams: { bookingId: this.bookingId } 
      });
    }, 1500);
  }

  private setDefaultValues() {
    this.cartItemsCount = 0;
    this.itemsTotal = 0;
    this.subtotal = 0;
    this.cgstAmount = 0;
    this.sgstAmount = 0;
    this.totalTaxAmount = 0;
    this.deliveryFee = 0;
    this.totalAmount = 0;
    this.originalTotalAmount = 0;
  }

  private calculateOrderSummary() {
    if (!this.bookingItems || !Array.isArray(this.bookingItems)) {
      this.setDefaultValues();
      return;
    }

    this.cartItemsCount = this.bookingItems.reduce((count, item) => 
      count + Number(item.Quantity), 0);
    
    this.itemsTotal = this.bookingItems.reduce((total, item) => {
      const price = Number(item.DiscountedPrice) || Number(item.Price) || 0;
      const quantity = Number(item.Quantity) || 0;
      return total + (price * quantity);
    }, 0);
    
    this.subtotal = this.itemsTotal;
    this.calculateTaxes();
    this.calculateDeliveryFee();
    this.calculateTotal();
    this.originalTotalAmount = this.totalAmount;
    
    console.log('Order Summary Calculated:', {
      subtotal: this.subtotal,
      cgst: this.cgstAmount,
      sgst: this.sgstAmount,
      tax: this.totalTaxAmount,
      delivery: this.deliveryFee,
      total: this.totalAmount
    });
  }

  private calculateTaxes() {
    if (this.taxSettings.taxEnabled && this.subtotal > 0) {
      this.cgstAmount = Number(((this.subtotal * this.taxSettings.cgstRate) / 100).toFixed(2));
      this.sgstAmount = Number(((this.subtotal * this.taxSettings.sgstRate) / 100).toFixed(2));
      this.totalTaxAmount = this.cgstAmount + this.sgstAmount;
    } else {
      this.cgstAmount = 0;
      this.sgstAmount = 0;
      this.totalTaxAmount = 0;
    }
  }

  private calculateDeliveryFee() {
    if (this.deliveryFeeSettings.enabled) {
      this.deliveryFee = this.subtotal >= this.deliveryFeeSettings.freeDeliveryThreshold 
        ? 0 
        : this.deliveryFeeSettings.amount;
    } else {
      this.deliveryFee = 0;
    }
  }

  private calculateTotal() {
    this.totalAmount = this.subtotal + this.totalTaxAmount + this.deliveryFee;
  }

  isFreeDelivery(): boolean {
    return this.deliveryFeeSettings.enabled && 
           this.subtotal >= this.deliveryFeeSettings.freeDeliveryThreshold;
  }

  // ==================== PROMO CODE ====================

  private loadAvailablePromoCodes() {
    if (!this.bookingDetails || !this.totalAmount) return;

    this.isLoadingPromoCodes = true;
    
    const params = new HttpParams()
      .set('mobileNumber', this.mobileNumber || 'TEMP_USER')
      .set('orderAmount', this.originalTotalAmount.toString())
      .set('tenantId', this.restaurantId.toString())
      .set('routeId', this.bookingDetails.route?.routeId?.toString() || '0');

    this.http.get<ApiResponse<any>>(
      `${this.API_BASE_URL}${this.PROMOCODE_ENDPOINT}/available`, 
      { params }
    )
      .pipe(
        catchError(() => of({ 
          success: false, 
          data: { promoCodes: [] } 
        })),
        finalize(() => this.isLoadingPromoCodes = false)
      )
      .subscribe(response => {
        if (response.success && response.data) {
          this.availablePromoCodes = response.data.promoCodes || [];
          console.log('Available promo codes:', this.availablePromoCodes.length);
        }
      });
  }

  togglePromoCodeInput() {
    this.showPromoCodeInput = !this.showPromoCodeInput;
    this.showAvailablePromoCodes = false;
  }

  toggleAvailablePromoCodes() {
    this.showAvailablePromoCodes = !this.showAvailablePromoCodes;
  }

  selectPromoCode(promo: AvailablePromoCode) {
    this.promoCodeState.code = promo.code;
    this.showAvailablePromoCodes = false;
    this.showPromoCodeInput = true;
    this.validatePromoCode();
  }

  validatePromoCode() {
    if (!this.promoCodeState.code.trim() || !this.bookingDetails) return;

    this.promoCodeState.isValidating = true;
    this.promoCodeState.validationMessage = '';

    const requestData = {
      promoCode: this.promoCodeState.code,
      bookingId: this.bookingId,
      mobileNumber: this.mobileNumber || 'TEMP_USER',
      orderAmount: this.originalTotalAmount,
      tenantId: this.restaurantId,
      routeId: this.bookingDetails.route?.routeId
    };

    this.http.post<ApiResponse<any>>(
      `${this.API_BASE_URL}${this.PROMOCODE_ENDPOINT}/validate`, 
      requestData
    )
      .pipe(
        catchError(error => of({ 
          success: false, 
          data: null, 
          message: error?.error?.message || 'Failed to validate promo code' 
        } as ApiResponse<any>)),
        finalize(() => this.promoCodeState.isValidating = false)
      )
      .subscribe(response => {
        if (response.success && response.data) {
          this.promoCodeState.validationMessage = response.message || 'Promo code is valid!';
          this.promoCodeState.discountAmount = Number(response.data.discountAmount) || 0;
          this.promoCodeState.finalAmount = Number(response.data.finalAmount) || this.originalTotalAmount;
          this.promoCodeState.promoTitle = response.data.promoCodeTitle || '';
        } else {
          this.promoCodeState.validationMessage = response.message || 'Invalid promo code';
          this.promoCodeState.discountAmount = 0;
          this.promoCodeState.finalAmount = this.originalTotalAmount;
          this.promoCodeState.promoTitle = '';
        }
      });
  }

  applyPromoCode() {
    if (!this.promoCodeState.code.trim() || !this.bookingDetails) return;

    this.isLoading = true;

    const requestData = {
      promoCode: this.promoCodeState.code,
      bookingId: this.bookingId,
      mobileNumber: this.mobileNumber || 'TEMP_USER',
      orderAmount: this.originalTotalAmount,
      tenantId: this.restaurantId,
      routeId: this.bookingDetails.route?.routeId
    };

    this.http.post<ApiResponse<any>>(
      `${this.API_BASE_URL}${this.PROMOCODE_ENDPOINT}/apply`, 
      requestData
    )
      .pipe(
        catchError(error => of({ 
          success: false, 
          message: error?.error?.message || 'Failed to apply promo code', 
          data: null 
        })),
        finalize(() => this.isLoading = false)
      )
      .subscribe(response => {
        if (response.success && response.data) {
          this.promoCodeState.isApplied = true;
          this.promoCodeState.discountAmount = Number(response.data.discountAmount) || 0;
          this.promoCodeState.finalAmount = Number(response.data.finalAmount) || this.originalTotalAmount;
          this.promoCodeState.promoTitle = response.data.promoCodeTitle || 'Discount Applied';
          this.promoCodeState.validationMessage = response.message || 'Promo code applied successfully!';
          this.promoCodeState.usageId = response.data.usageId || response.data.id;
          this.totalAmount = this.promoCodeState.finalAmount;
          
          alert(`🎉 Promo code applied! You saved ₹${this.formatCurrency(this.promoCodeState.discountAmount)}`);
          this.showPromoCodeInput = false;
        } else {
          alert(response.message || 'Failed to apply promo code');
        }
      });
  }

  removePromoCode() {
    this.promoCodeState = {
      code: '',
      isApplied: false,
      isValidating: false,
      validationMessage: '',
      discountAmount: 0,
      finalAmount: 0,
      promoTitle: '',
      usageId: undefined
    };
    this.totalAmount = this.originalTotalAmount;
    this.showPromoCodeInput = false;
  }

  getFinalTotal(): number {
    return this.promoCodeState.isApplied 
      ? this.promoCodeState.finalAmount 
      : this.totalAmount;
  }

  // ==================== OTP FLOW ====================

  isValidMobile(): boolean {
    return this.mobileNumber.length === 10 && /^\d{10}$/.test(this.mobileNumber);
  }

  async sendOTP() {
    if (!this.isValidMobile() || this.isLoading) return;

    this.isLoading = true;
    
    try {
      console.log('Sending OTP to:', this.mobileNumber);
      
      const response = await this.http.post<SendOtpResponse>(
        `${this.API_BASE_URL}${this.OTP_ENDPOINT}/send-otp`,
        { 
          mobileNumber: this.mobileNumber, 
          bookingId: this.bookingId 
        }
      ).toPromise();
      
      console.log('Send OTP response:', response);
      
      if (response?.success) {
        this.otpId = response.otpId || '';
        
        // Pre-fill passenger details if available from previous booking
        if (response.passengerName) {
          this.passengerDetails.name = response.passengerName;
          console.log('Pre-filled name:', response.passengerName);
        }
        if (response.passengerEmail) {
          this.passengerDetails.email = response.passengerEmail;
          console.log('Pre-filled email:', response.passengerEmail);
        }
        
        // Move to OTP step (which now includes details form)
        this.currentStep = 'otp';
        this.clearOTP();
        this.startResendTimer();
        
        // Focus on first OTP input
        setTimeout(() => this.focusFirstInput(), 100);
        
        alert('OTP sent successfully! Check your messages.');
      } else {
        throw new Error(response?.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      alert(error?.error?.message || error?.message || 'Error sending OTP. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async confirmBooking() {
    // Verify OTP + Submit all details + Confirm booking in ONE call
    if (!this.isOTPComplete()) {
      alert('Please enter the complete OTP');
      return;
    }

    if (!this.isDetailsValid()) {
      alert('Please fill in all required fields correctly');
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;
    
    try {
      const requestData: VerifyOtpRequest = {
        mobileNumber: this.mobileNumber,
        otp: this.getFullOTP(),
        bookingId: this.bookingId,
        passengerName: this.passengerDetails.name.trim(),
        passengerEmail: this.passengerDetails.email.trim() || undefined,
        additionalRemarks: this.passengerDetails.remarks.trim() || undefined,
        pickupLatitude: this.passengerDetails.latitude || undefined,
        pickupLongitude: this.passengerDetails.longitude || undefined,
        pickupAddress: this.passengerDetails.address || undefined,
        subtotal: this.subtotal,
        cgst: this.cgstAmount,
        sgst: this.sgstAmount,
        taxAmount: this.totalTaxAmount,
        deliveryFee: this.deliveryFee,
        finalAmount: this.getFinalTotal(),
        tenantID:this.restaurantId
      };

      // Include promo code usage ID if applied
      if (this.promoCodeState.isApplied && this.promoCodeState.usageId) {
        requestData.promoCodeUsageId = this.promoCodeState.usageId;
      }

      console.log('Calling verify-otp API with:', requestData);

      const apiUrl = `${this.API_BASE_URL}${this.OTP_ENDPOINT}/verify-otp`;
      
      const response = await this.http.post<ApiResponse<BookingCompletionResponse>>(
        apiUrl,
        requestData
      ).toPromise();
      
      console.log('Verify OTP response:', response);
      
      if (response?.success && response.data) {
        console.log('Booking confirmed successfully!');
        
        // Navigate to order confirmation page
        this.router.navigate(['/order-confirmation'], {
          queryParams: { 
            bookingId: this.bookingId,
            totalAmount: response.data.totalAmount || this.getFinalTotal(),
            originalAmount: response.data.originalAmount || this.originalTotalAmount,
            discountAmount: response.data.discountAmount || this.promoCodeState.discountAmount,
            promoCode: response.data.promoCodeApplied || this.promoCodeState.code,
            mobileNumber: this.mobileNumber
          }
        });
      } else {
        throw new Error(response?.message || 'OTP verification failed');
      }
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      const errorMsg = error?.error?.message || error?.message || 'Error confirming booking. Please try again.';
      alert(errorMsg);
      
      // If OTP is invalid, clear it so user can re-enter
      if (errorMsg.toLowerCase().includes('otp')) {
        this.clearOTP();
        setTimeout(() => this.focusFirstInput(), 100);
      }
    } finally {
      this.isLoading = false;
    }
  }

  isDetailsValid(): boolean {
    const nameValid = this.passengerDetails.name.trim().length >= 2 && 
                      this.passengerDetails.name.trim().length <= 100;
    
    const emailValid = !this.passengerDetails.email.trim() || 
                       this.isValidEmail(this.passengerDetails.email);
    
    return nameValid && emailValid;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ==================== OTP INPUT HANDLING ====================

  onOtpKeyUp(event: KeyboardEvent, position: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow digits
    if (!/^\d*$/.test(value)) {
      input.value = '';
      this.setOtpValue(position, '');
      return;
    }

    if (value.length === 1) {
      this.setOtpValue(position, value);
      this.moveToNext(position);
    } else if (value.length === 0) {
      this.setOtpValue(position, '');
    } else {
      // If multiple digits pasted, take last one
      const lastDigit = value.slice(-1);
      input.value = lastDigit;
      this.setOtpValue(position, lastDigit);
      this.moveToNext(position);
    }
  }

  onOtpKeyDown(event: KeyboardEvent, position: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (input.value === '') {
        this.moveToPrevious(position);
      } else {
        input.value = '';
        this.setOtpValue(position, '');
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moveToPrevious(position);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.moveToNext(position);
    } else if (!/\d/.test(event.key) && 
               !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
      event.preventDefault();
    }
  }

  onOtpPaste(event: ClipboardEvent, position: number) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const digits = pastedText.replace(/\D/g, '').split('').slice(0, 4);
    
    if (digits.length > 0) {
      this.clearOTP();
      digits.forEach((digit, index) => {
        if (index < 4) {
          this.setOtpValue(index + 1, digit);
          const inputElement = this.getInputElement(index + 1);
          if (inputElement) inputElement.value = digit;
        }
      });
      
      // Focus on the next empty field or last field
      const focusPosition = Math.min(digits.length + 1, 4);
      this.focusInput(focusPosition);
    }
  }

  private setOtpValue(position: number, value: string) {
    switch (position) {
      case 1: this.otp1 = value; break;
      case 2: this.otp2 = value; break;
      case 3: this.otp3 = value; break;
      case 4: this.otp4 = value; break;
    }
  }

  private moveToNext(position: number) {
    if (position < 4) {
      this.focusInput(position + 1);
    }
  }

  private moveToPrevious(position: number) {
    if (position > 1) {
      this.focusInput(position - 1);
    }
  }

  private focusInput(position: number) {
    const inputElement = this.getInputElement(position);
    if (inputElement) {
      inputElement.focus();
      inputElement.select();
    }
  }

  private focusFirstInput() {
    this.focusInput(1);
  }

  private getInputElement(position: number): HTMLInputElement | null {
    const inputs = this.otpInputs?.toArray();
    return inputs && inputs[position - 1]?.nativeElement || null;
  }

  private clearOTP() {
    this.otp1 = '';
    this.otp2 = '';
    this.otp3 = '';
    this.otp4 = '';
    
    // Clear input values
    this.otpInputs?.toArray().forEach(input => {
      input.nativeElement.value = '';
    });
  }

  getFullOTP(): string {
    return this.otp1 + this.otp2 + this.otp3 + this.otp4;
  }

  isOTPComplete(): boolean {
    return !!(
      this.otp1 && this.otp2 && this.otp3 && this.otp4 && 
      this.otp1.length === 1 && this.otp2.length === 1 && 
      this.otp3.length === 1 && this.otp4.length === 1
    );
  }

  changeMobile() {
    this.currentStep = 'mobile';
    this.clearOTP();
    this.stopResendTimer();
    
    // Reset passenger details
    this.passengerDetails = {
      name: '',
      email: '',
      remarks: '',
      latitude: this.passengerDetails.latitude, // Keep location
      longitude: this.passengerDetails.longitude,
      address: this.passengerDetails.address
    };
  }

  async resendOTP() {
    if (this.resendTimer === 0 && !this.isLoading) {
      await this.sendOTP();
    }
  }

  private startResendTimer() {
    this.resendTimer = 30;
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.stopResendTimer();
      }
    }, 1000);
  }

  private stopResendTimer() {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
    this.resendTimer = 0;
  }

  // ==================== HELPERS ====================

  private getErrorMessage(error: any): string {
    if (error.status === 404) {
      return 'Booking not found';
    }
    if (error.status === 0) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    if (error.status >= 500) {
      return 'Server error occurred. Please try again later.';
    }
    return error.error?.message || error.message || 'An error occurred';
  }

  formatCurrency(amount: number): string {
    return isNaN(amount) ? '0.00' : amount.toFixed(2);
  }

  getSafeCount(): number {
    return isNaN(this.cartItemsCount) ? 0 : this.cartItemsCount;
  }

  goBack() {
    this.router.navigate(['/menu'], {
      queryParams: { 
        restaurantId: this.restaurantId, 
        bookingId: this.bookingId 
      }
    });
  }
}

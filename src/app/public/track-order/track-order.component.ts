import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Order {
  orderId: string;
  bookingId: string;
  restaurantName: string;
  items: string;
  amount: number;
  status: string;
  busNumber: string;
  busName: string;
  departureDate: string;
  departureTime: string;
  orderConfirmedAt: string;
  route?: string;
  deliveryStop?: string;
  orderTime?: string;
  estimatedTime?: string;
  deliveredTime?: string | null;
}

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './track-order.component.html',
  styleUrl: './track-order.component.scss'
})
export class TrackOrderComponent implements OnInit {
  step: 'phone' | 'otp' | 'orders' = 'phone';
  phoneNumber = '';
  otp = '';
  isSubmitting = false;
  errorMessage = '';
  orders: Order[] = [];
  
  // API Base URL - Update this to match your backend
  private apiUrl = `${environment.apiBaseUrl}/track-order`;
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}
  
  ngOnInit() {
    window.scrollTo(0, 0);
  }

  /**
   * Submit phone number and request OTP
   */
  onSubmitPhone() {
    // Validate phone number
    if (this.phoneNumber.length !== 10) {
      this.errorMessage = 'Please enter a valid 10-digit phone number';
      return;
    }

    if (!/^[0-9]{10}$/.test(this.phoneNumber)) {
      this.errorMessage = 'Phone number must contain only digits';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    console.log('📞 Sending OTP request for:', this.phoneNumber);

    this.http.post<any>(`${this.apiUrl}/send-otp`, {
      phoneNumber: this.phoneNumber
    }).subscribe({
      next: (response) => {
        console.log('✅ Send OTP Response:', response);
        this.isSubmitting = false;
        
        if (response.success) {
          this.step = 'otp';
          this.errorMessage = '';
          console.log('📨 OTP sent successfully - moved to OTP step');
        } else {
          this.errorMessage = response.message || 'Failed to send OTP';
        }
      },
      error: (error) => {
        console.error('❌ Send OTP Error:', error);
        this.isSubmitting = false;
        
        if (error.status === 404) {
          this.errorMessage = error.error?.message || 'No orders found for this phone number';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid phone number';
        } else if (error.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check your connection.';
        } else {
          this.errorMessage = error.error?.message || 'Failed to send OTP. Please try again.';
        }
      }
    });
  }

  /**
   * Verify OTP and get ALL booking details
   */
  onSubmitOtp() {
    // Validate OTP
    if (this.otp.length !== 4) {
      this.errorMessage = 'Please enter a valid 6-digit OTP';
      return;
    }

    if (!/^[0-9]{4}$/.test(this.otp)) {
      this.errorMessage = 'OTP must contain only digits';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    console.log('🔐 Verifying OTP for:', this.phoneNumber);

    this.http.post<any>(`${this.apiUrl}/verify-otp`, {
      phoneNumber: this.phoneNumber,
      otp: this.otp
    }).subscribe({
      next: (response) => {
        console.log('✅ Verify OTP Response:', response);
        this.isSubmitting = false;
        
        if (!response.success) {
          this.errorMessage = response.message || 'Verification failed';
          return;
        }

        // Single booking - navigate to order confirmation page
        if (response.bookingId) {
          console.log('📍 Single booking found - navigating to:', response.bookingId);
          this.router.navigate(['/order-status'], {
            queryParams: { bookingId: response.bookingId }
          });
        } 
        // Multiple bookings - show ALL orders list
        else if (response.bookings && response.bookings.length > 0) {
          console.log('📋 ALL bookings found:', response.bookings.length);
          this.orders = response.bookings.map((booking: any) => this.mapBookingToOrder(booking));
          this.step = 'orders';
          console.log('📦 Orders loaded:', this.orders);
        } 
        else {
          this.errorMessage = 'No active orders found';
        }
      },
      error: (error) => {
        console.error('❌ Verify OTP Error:', error);
        this.isSubmitting = false;
        
        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid OTP. Please try again.';
        } else if (error.status === 404) {
          this.errorMessage = 'No active orders found';
        } else if (error.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check your connection.';
        } else {
          this.errorMessage = error.error?.message || 'Verification failed. Please try again.';
        }
      }
    });
  }

  /**
   * Resend OTP
   */
  resendOtp() {
    this.isSubmitting = true;
    this.errorMessage = '';

    console.log('🔄 Resending OTP for:', this.phoneNumber);

    this.http.post<any>(`${this.apiUrl}/send-otp`, {
      phoneNumber: this.phoneNumber
    }).subscribe({
      next: (response) => {
        console.log('✅ Resend OTP Response:', response);
        this.isSubmitting = false;
        
        if (response.success) {
          this.errorMessage = 'OTP resent successfully!';
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            if (this.errorMessage === 'OTP resent successfully!') {
              this.errorMessage = '';
            }
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Failed to resend OTP';
        }
      },
      error: (error) => {
        console.error('❌ Resend OTP Error:', error);
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

  /**
   * Change phone number - go back to phone step
   */
  changePhone() {
    this.step = 'phone';
    this.phoneNumber = '';
    this.otp = '';
    this.orders = [];
    this.errorMessage = '';
    console.log('🔙 Returned to phone input step');
  }

  /**
   * Navigate to specific order details
   */
  viewOrderDetails(bookingId: string) {
    console.log('📖 Viewing order details for:', bookingId);
    this.router.navigate(['/order-confirmation'], {
      queryParams: { bookingId }
    });
  }

  /**
   * Map booking DTO to Order interface
   */
  private mapBookingToOrder(booking: any): Order {
    const route = `${booking.busName || 'Route'}`;
    const deliveryStop = 'Bus Stop'; // Can be enhanced with actual pickup location
    const orderTime = this.formatDateTime(booking.orderConfirmedAt);
    const estimatedTime = this.calculateETA(booking.status);
    const deliveredTime = booking.status === 'delivered' 
      ? this.formatDateTime(booking.orderConfirmedAt) 
      : null;

    return {
      orderId: booking.orderId,
      bookingId: booking.bookingId,
      restaurantName: booking.restaurantName,
      items: booking.items,
      amount: booking.amount,
      status: booking.status,
      busNumber: booking.busNumber || 'N/A',
      busName: booking.busName || 'N/A',
      departureDate: booking.departureDate,
      departureTime: booking.departureTime,
      orderConfirmedAt: booking.orderConfirmedAt,
      route,
      deliveryStop,
      orderTime,
      estimatedTime,
      deliveredTime
    };
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'preparing': '#ff9800',
      'ready': '#2196f3',
      'out-for-delivery': '#9c27b0',
      'delivered': '#4caf50',
      'cancelled': '#f44336',
      'pending': '#999'
    };
    return colors[status?.toLowerCase()] || '#666';
  }

  /**
   * Get user-friendly status text
   */
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'preparing': 'Preparing',
      'ready': 'Ready for Pickup',
      'out-for-delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'pending': 'Pending'
    };
    return statusMap[status?.toLowerCase()] || status || 'Unknown';
  }

  /**
   * Format date-time string to readable format
   */
  private formatDateTime(dateTimeStr: string | null | undefined): string {
    if (!dateTimeStr) return 'N/A';
    
    try {
      // Handle different date formats from backend
      const date = new Date(dateTimeStr);
      
      if (isNaN(date.getTime())) {
        return dateTimeStr; // Return original if parsing fails
      }
      
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateTimeStr;
    }
  }

  /**
   * Calculate estimated time based on order status
   */
  private calculateETA(status: string): string {
    const etaMap: { [key: string]: string } = {
      'preparing': '15-20 mins',
      'ready': '5-10 mins',
      'out-for-delivery': '10-15 mins',
      'pending': '20-25 mins'
    };
    return etaMap[status?.toLowerCase()] || '15-20 mins';
  }

  /**
   * Format amount with proper currency
   */
  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }
}

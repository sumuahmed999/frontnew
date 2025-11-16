// components/notification/order-notification/order-notification.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { catchError, of } from 'rxjs';
import { RestaurantNotificationService, NewOrderNotification } from '../../../service/restaurant-notification.service';
import { environment } from '../../../../environments/environment';

interface UpdateOrderStatusRequest {
  bookingId: string;
  status: string;
  rejectReason?: string;
  cancelReason?: string;
  timeRequiredInMinutes?: number;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  deliveryPersonId?: string;
  additionalRemarks?: string;
}

interface UpdateOrderStatusResponse {
  success: boolean;
  message: string;
  bookingId: string;
  newStatus: string;
  updatedAt: string;
  additionalData?: any;
}

@Component({
  selector: 'app-order-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-notification.component.html',
  styleUrl: './order-notification.component.scss'
})
export class OrderNotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly API_URL = `${environment.apiBaseUrl}/OrderStatus`;

  currentOrder: NewOrderNotification | null = null;
  showNotification = false;
  isProcessing = false;
  errorMessage: string | null = null;

  constructor(
    private restaurantNotificationService: RestaurantNotificationService,
    private http: HttpClient
  ) {
    console.log('🟢 OrderNotificationComponent constructor');
  }

  ngOnInit() {
    console.log('🟢 OrderNotificationComponent ngOnInit');
    
    // ✅ Subscribe to new orders from service
    this.restaurantNotificationService.newOrder$
      .pipe(takeUntil(this.destroy$))
      .subscribe((order: NewOrderNotification | null) => {
        if (order) {
          this.currentOrder = order;
          this.showNotification = true;
          this.errorMessage = null;
          console.log('📦 New order received in component:', order);
        }
      });

    // Request notification permission
    this.restaurantNotificationService.requestNotificationPermission();
  }

  ngOnDestroy() {
    console.log('🛑 OrderNotificationComponent destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Accept order - Just close the popup
   */
  acceptOrder() {
    if (!this.currentOrder) return;

    console.log('✅ Accepting order:', this.currentOrder.orderId);
    
    this.showSuccessMessage(
      `Order #${this.currentOrder.orderId} from ${this.currentOrder.passengerName} accepted!`
    );

    setTimeout(() => {
      this.closeNotification();
      // Clear the notification so it doesn't reappear on navigation
      this.restaurantNotificationService.clearNewOrderNotification();
    }, 1500);
  }

  /**
   * Reject order - Call API with reason
   */
  async rejectOrder() {
    if (!this.currentOrder || this.isProcessing) return;

    console.log('🟡 Reject order initiated');

    const reason = this.promptForReason(
      'Reject Order',
      'Please provide a reason for rejecting this order (minimum 10 characters):'
    );

    if (!reason) {
      console.log('❌ Rejection cancelled');
      return;
    }

    if (reason.length < 10) {
      this.errorMessage = 'Rejection reason must be at least 10 characters long';
      alert(this.errorMessage);
      return;
    }

    this.isProcessing = true;
    this.errorMessage = null;
    this.restaurantNotificationService.stopRinging();

    const request: UpdateOrderStatusRequest = {
      bookingId: this.currentOrder.bookingId,
      status: 'Rejected',
      rejectReason: reason,
      additionalRemarks: `Order rejected at ${new Date().toLocaleTimeString()}`
    };

    try {
      console.log('🟡 Sending reject request:', request);

      const response = await this.http.put<UpdateOrderStatusResponse>(
        `${this.API_URL}/update`,
        request
      ).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('❌ Error:', error);
          return of(this.handleError(error));
        })
      ).toPromise();

      if (response && response.success) {
        console.log('✅ Order rejected successfully');
        this.showSuccessMessage(`Order #${this.currentOrder.orderId} rejected!`);
        
        setTimeout(() => {
          this.closeNotification();
        }, 2000);
      } else {
        this.errorMessage = response?.message || 'Failed to reject order';
      }
    } catch (error) {
      console.error('❌ Exception:', error);
      this.errorMessage = 'An error occurred while rejecting the order';
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Close notification
   */
  closeNotification() {
    console.log('🔕 Closing notification');
    this.restaurantNotificationService.stopRinging();
    this.showNotification = false;
    this.currentOrder = null;
    this.errorMessage = null;
    this.isProcessing = false;
    // Clear the notification so it doesn't reappear on navigation
    this.restaurantNotificationService.clearNewOrderNotification();
  }

  /**
   * Handle errors
   */
  private handleError(error: HttpErrorResponse): UpdateOrderStatusResponse {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 400 && error.error?.errors) {
        const validationErrors = error.error.errors;
        const errorMessages = Object.values(validationErrors).flat();
        errorMessage = errorMessages.join(', ');
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Server error ${error.status}`;
      }
    }

    return {
      success: false,
      message: errorMessage,
      bookingId: '',
      newStatus: '',
      updatedAt: new Date().toISOString()
    };
  }

  private showSuccessMessage(message: string) {
    console.log('✅ Success:', message);
    alert(message);
  }

  private promptForReason(title: string, message: string): string | null {
    const reason = prompt(message);
    return reason === null ? null : reason.trim();
  }

  formatCurrency(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  hasDiscount(): boolean {
    return this.currentOrder ? (this.currentOrder.discountAmount ?? 0) > 0 : false;
  }

  hasTax(): boolean {
    return this.currentOrder ? (this.currentOrder.taxAmount ?? 0) > 0 : false;
  }

  hasDeliveryFee(): boolean {
    return this.currentOrder ? (this.currentOrder.deliveryFee ?? 0) > 0 : false;
  }
}

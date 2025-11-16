// src/app/components/recent-orders/recent-orders.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil, debounceTime, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BookingItemDetail {
  itemId: number;
  itemName: string;
  categoryId: number;
  categoryName: string;
  subcategoryId: number;
  subcategoryName: string;
  price: number;
  discountedPrice: number | null;
  quantity: number;
  specialInstructions: string | null;
  addedAt: string;
  updatedAt: string;
  canceledAt: string | null;
  cancellationReason: string | null;
  status: string;
}

export interface RecentOrder {
  id: string;
  passengerName: string;
  busNumber: string;
  restaurant: string;
  items: number;
  amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'canceled' | 'rejected';
  time: string;
  bookingId?: string;
  isUpdating?: boolean;
  errorMessage?: string;
  showDropdown?: boolean;
  // Full order details (optional, from Orders API)
  fullDetails?: {
    busName?: string;
    startLocationName?: string;
    endLocationName?: string;
    departureDate?: string;
    departureTime?: string;
    passengerPhone?: string;
    passengerEmail?: string | null;
    bookingStatus?: string;
    totalAmount?: number;
    originalAmount?: number;
    discountAmount?: number;
    subtotal?: number;
    cgst?: number;
    sgst?: number;
    taxAmount?: number;
    deliveryFee?: number;
    paymentStatus?: string;
    promoCode?: string | null;
    createdAt?: string;
    updatedAt?: string;
    orderConfirmedAt?: string | null;
    preparingStartedAt?: string | null;
    readyAt?: string | null;
    completedAt?: string | null;
    canceledAt?: string | null;
    rejectedAt?: string | null;
    cancelReason?: string | null;
    rejectReason?: string | null;
    additionalRemarks?: string | null;
    pickupLocationAddress?: string;
    pickupLocationLatitude?: number;
    pickupLocationLongitude?: number;
    bookingItems?: BookingItemDetail[];
    canceledItems?: BookingItemDetail[];
  };
}

interface UpdateOrderStatusRequest {
  bookingId: string;
  status: string;
  rejectReason?: string;
  cancelReason?: string;
  timeRequiredInMinutes?: number;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
}

interface UpdateOrderStatusResponse {
  success: boolean;
  message: string;
  bookingId: string;
  newStatus: string;
  updatedAt: string;
}

@Component({
  selector: 'app-recent-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './recent-orders.component.html',
  styleUrl: './recent-orders.component.scss'
})
export class RecentOrdersComponent implements OnInit, OnDestroy, OnChanges {
  @Input() orders: RecentOrder[] = [];
  @Input() isLoading = false;
  @Input() pendingCount = 0;
  @Input() showLocationButton = false;
  @Output() orderUpdated = new EventEmitter<RecentOrder>();
  @Output() viewLocation = new EventEmitter<RecentOrder>();

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private readonly API_URL = `${environment.apiBaseUrl}/OrderStatus`;

  viewMode: 'list' | 'card' = 'list';
  searchQuery = '';
  filteredOrders: RecentOrder[] = [];

  // Status Update Modal
  showStatusModal = false;
  currentOrderForStatus: RecentOrder | null = null;
  selectedStatus: string | null = null;
  statusReason = '';
  isUpdatingStatus = false;
  statusUpdateError = '';
  showReasonError = false;

  // Delivery Modal
  showDeliveryModal = false;
  currentOrderForDelivery: RecentOrder | null = null;
  deliveryForm: FormGroup;
  isSubmittingDelivery = false;
  deliveryError: string | null = null;

  // Order Details Modal
  showOrderDetailsModal = false;
  currentOrderDetails: any = null;
  isLoadingOrderDetails = false;
  orderDetailsError: string | null = null;

  // Status transition rules
  private statusTransitions: { [key: string]: string[] } = {
    'pending': ['confirmed', 'rejected'],
    'confirmed': ['preparing', 'canceled'],
    'preparing': ['ready', 'canceled'],
    'ready': ['completed', 'canceled'],
    'completed': [],
    'rejected': [],
    'canceled': []
  };

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.deliveryForm = this.fb.group({
      deliveryPersonId: ['', [Validators.required, Validators.minLength(2)]],
      deliveryPersonName: ['', [Validators.required, Validators.minLength(3)]],
      deliveryPersonPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });
  }

  ngOnInit() {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.filterOrders();
      });

    this.filterOrders();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges() {
    if (this.orders) {
      this.filterOrders();
    }
  }

  onSearchChange() {
    this.searchSubject$.next(this.searchQuery);
  }

  private filterOrders() {
    if (!this.searchQuery.trim()) {
      this.filteredOrders = [...this.orders];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredOrders = this.orders.filter(order => {
      return (
        order.id.toLowerCase().includes(query) ||
        order.passengerName.toLowerCase().includes(query) ||
        order.busNumber.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
      );
    });
  }

  // Status Update Modal Methods
  openStatusModal(order: RecentOrder) {
    this.currentOrderForStatus = order;
    this.selectedStatus = null;
    this.statusReason = '';
    this.statusUpdateError = '';
    this.showReasonError = false;
    this.showStatusModal = true;
  }

  closeStatusModal() {
    if (this.isUpdatingStatus) return;
    this.showStatusModal = false;
    this.currentOrderForStatus = null;
    this.selectedStatus = null;
    this.statusReason = '';
    this.statusUpdateError = '';
    this.showReasonError = false;
  }

  selectStatus(status: string) {
    this.selectedStatus = status;
    this.showReasonError = false;
    this.statusUpdateError = '';
    
    // Clear reason if switching away from reject/cancel
    if (status !== 'rejected' && status !== 'canceled') {
      this.statusReason = '';
    }
  }

  async confirmStatusUpdate() {
    if (!this.selectedStatus || !this.currentOrderForStatus) return;

    // Validate reason for reject/cancel
    if ((this.selectedStatus === 'rejected' || this.selectedStatus === 'canceled') && !this.statusReason.trim()) {
      this.showReasonError = true;
      this.statusUpdateError = 'Please provide a reason';
      return;
    }

    // Check if reason is at least 10 characters
    if ((this.selectedStatus === 'rejected' || this.selectedStatus === 'canceled') && this.statusReason.trim().length < 10) {
      this.statusUpdateError = 'Reason must be at least 10 characters';
      this.showReasonError = true;
      return;
    }

    // Special handling for 'ready' status - open delivery modal
    if (this.selectedStatus === 'ready') {
      const orderToDeliver = this.currentOrderForStatus;
      this.closeStatusModal();
      this.openDeliveryModal(orderToDeliver!);
      return;
    }

    this.isUpdatingStatus = true;
    this.statusUpdateError = '';

    const order = this.currentOrderForStatus;

    // Prepare request based on status
    const request: UpdateOrderStatusRequest = {
      bookingId: order.bookingId!,
      status: this.selectedStatus,
      timeRequiredInMinutes: this.selectedStatus === 'preparing' ? 30 : undefined,
      rejectReason: this.selectedStatus === 'rejected' ? this.statusReason.trim() : undefined,
      cancelReason: this.selectedStatus === 'canceled' ? this.statusReason.trim() : undefined
    };

    try {
      const response = await this.http.put<UpdateOrderStatusResponse>(
        `${this.API_URL}/update`,
        request
      ).pipe(
        catchError(error => of(this.handleError(error)))
      ).toPromise();

      if (response && response.success) {
        order.status = this.normalizeStatus(this.selectedStatus);
        order.time = this.formatTime(new Date().toISOString());
        order.errorMessage = undefined;
        order.isUpdating = false;
        this.orderUpdated.emit(order);
        
        this.isUpdatingStatus = false;
        this.closeStatusModal();
      } else {
        this.statusUpdateError = response?.message || 'Failed to update order status';
        this.isUpdatingStatus = false;
      }
    } catch (error) {
      this.statusUpdateError = 'An error occurred while updating the order';
      this.isUpdatingStatus = false;
    }
  }

  canTransitionTo(currentStatus: string | undefined, newStatus: string): boolean {
    if (!currentStatus) return false;
    const allowed = this.statusTransitions[currentStatus.toLowerCase()] || [];
    return allowed.includes(newStatus.toLowerCase());
  }

  canRejectOrCancel(status: string | undefined): boolean {
    if (!status) return false;
    return this.canTransitionTo(status, 'rejected') || this.canTransitionTo(status, 'canceled');
  }

  // Delivery Modal Methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.deliveryForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  openDeliveryModal(order: RecentOrder) {
    this.currentOrderForDelivery = order;
    this.showDeliveryModal = true;
    this.deliveryError = null;
    this.deliveryForm.reset();
  }

  closeDeliveryModal() {
    if (this.isSubmittingDelivery) return;
    this.showDeliveryModal = false;
    this.currentOrderForDelivery = null;
    this.deliveryForm.reset();
    this.deliveryError = null;
  }

  async submitDeliveryForm() {
    if (!this.deliveryForm.valid || !this.currentOrderForDelivery) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.deliveryForm.controls).forEach(key => {
        this.deliveryForm.get(key)?.markAsTouched();
      });
      this.deliveryError = 'Please fill all required fields correctly';
      return;
    }

    this.isSubmittingDelivery = true;
    this.deliveryError = null;

    const formValue = this.deliveryForm.value;
    const order = this.currentOrderForDelivery;

    const request: UpdateOrderStatusRequest = {
      bookingId: order.bookingId!,
      status: 'ready',
      deliveryPersonId: formValue.deliveryPersonId,
      deliveryPersonName: formValue.deliveryPersonName,
      deliveryPersonPhone: formValue.deliveryPersonPhone
    };

    try {
      const response = await this.http.put<UpdateOrderStatusResponse>(
        `${this.API_URL}/update`,
        request
      ).pipe(
        catchError(error => of(this.handleError(error)))
      ).toPromise();

      if (response && response.success) {
        order.status = 'ready';
        order.time = this.formatTime(new Date().toISOString());
        order.errorMessage = undefined;
        order.isUpdating = false;
        this.orderUpdated.emit(order);
        
        this.isSubmittingDelivery = false;
        this.closeDeliveryModal();
      } else {
        this.deliveryError = response?.message || 'Failed to assign delivery person';
        this.isSubmittingDelivery = false;
      }
    } catch (error) {
      this.deliveryError = 'An error occurred while assigning delivery person';
      this.isSubmittingDelivery = false;
    }
  }

  clearError(order: RecentOrder) {
    order.errorMessage = undefined;
  }

  // Order Details Modal Methods
  openOrderDetailsModal(order: RecentOrder) {
    this.showOrderDetailsModal = true;
    this.orderDetailsError = null;
    this.isLoadingOrderDetails = false;

    // Check if we have full details with items
    if (order.fullDetails && order.fullDetails.bookingItems) {
      // Use existing data - NO API CALL
      this.currentOrderDetails = {
        bookingId: order.bookingId,
        bookNumber: order.id,
        busNumber: order.busNumber,
        passengerName: order.passengerName,
        totalAmount: order.amount,
        bookingStatus: order.status,
        ...order.fullDetails
      };
      console.log('✅ Using existing order details (no API call)');
    } else {
      // No full details available
      this.orderDetailsError = 'Order details not available. Please refresh the page.';
      console.warn('⚠️ Order missing full details:', order.id);
    }
  }

  closeOrderDetailsModal() {
    this.showOrderDetailsModal = false;
    this.currentOrderDetails = null;
    this.orderDetailsError = null;
  }

  private handleError(error: HttpErrorResponse): UpdateOrderStatusResponse {
    let msg = 'An error occurred';
    if (error.error?.message) msg = error.error.message;
    else if (error.message) msg = error.message;

    return {
      success: false,
      message: msg,
      bookingId: '',
      newStatus: '',
      updatedAt: new Date().toISOString()
    };
  }

  normalizeStatus(status: string): RecentOrder['status'] {
    const n = status.toLowerCase();
    if (n === 'delivered' || n === 'completed') return 'completed';
    if (n === 'ready') return 'ready';
    if (n === 'preparing') return 'preparing';
    if (n === 'confirmed') return 'confirmed';
    if (n === 'canceled') return 'canceled';
    if (n === 'rejected') return 'rejected';
    return 'pending';
  }

  getStatusClass(status: string): string {
    const map: { [key: string]: string } = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'preparing': 'status-preparing',
      'ready': 'status-ready',
      'completed': 'status-completed',
      'canceled': 'status-canceled',
      'rejected': 'status-rejected'
    };
    return map[status] || 'status-pending';
  }

  getStatusIcon(status: string): string {
    const map: { [key: string]: string } = {
      'pending': 'bi-clock',
      'confirmed': 'bi-check-circle',
      'preparing': 'bi-fire',
      'ready': 'bi-box-seam',
      'completed': 'bi-check2-all',
      'canceled': 'bi-x-circle',
      'rejected': 'bi-x-octagon'
    };
    return map[status] || 'bi-clock';
  }

  formatCurrency(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
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
      return 'Just now';
    }
  }

  /**
   * Handle view location click
   */
  onViewLocation(order: RecentOrder) {
    this.viewLocation.emit(order);
  }

  /**
   * Check if location can be viewed for this order
   */
  canViewLocation(order: RecentOrder): boolean {
    const activeStatuses = ['confirmed', 'preparing', 'ready'];
    return activeStatuses.includes(order.status.toLowerCase());
  }
}

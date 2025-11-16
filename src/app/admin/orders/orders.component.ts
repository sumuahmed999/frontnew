// src/app/admin/orders/orders.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RecentOrdersComponent, RecentOrder, BookingItemDetail } from '../../components/recent-orders/recent-orders.component';
import { DashboardService, OrdersFilterParams, OrderDetail, StatusCounts } from '../../service/dashboard.service';
import { AuthService } from '../../service/auth.service';
import { RestaurantNotificationService, DashboardOrderUpdate } from '../../service/restaurant-notification.service';
import { UserLocationModalComponent } from '../user-location-modal/user-location-modal.component';
import { AdminLocationTrackingService } from '../../service/admin-location-tracking.service';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'canceled' | 'rejected';

interface StatusFilter {
  value: OrderStatus;
  label: string;
  icon: string;
  color: string;
  count: number;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RecentOrdersComponent, UserLocationModalComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit, OnDestroy {
  @ViewChild(UserLocationModalComponent) locationModal!: UserLocationModalComponent;
  
  private destroy$ = new Subject<void>();

  // Math for template
  Math = Math;

  // Orders data
  allOrders: RecentOrder[] = [];
  filteredOrders: RecentOrder[] = [];
  isLoading = false;

  // Current filter
  currentStatus: OrderStatus = 'all';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;
  hasPreviousPage = false;
  hasNextPage = false;

  // Status filters with counts
  statusFilters: StatusFilter[] = [
    { value: 'all', label: 'All Orders', icon: 'bi-list-ul', color: '#6c757d', count: 0 },
    { value: 'pending', label: 'Pending', icon: 'bi-clock', color: '#ffc107', count: 0 },
    { value: 'confirmed', label: 'Confirmed', icon: 'bi-check-circle', color: '#28a745', count: 0 },
    { value: 'preparing', label: 'Preparing', icon: 'bi-fire', color: '#fd7e14', count: 0 },
    { value: 'ready', label: 'Ready', icon: 'bi-box-seam', color: '#17a2b8', count: 0 },
    { value: 'completed', label: 'Completed', icon: 'bi-check2-all', color: '#6f42c1', count: 0 },
    { value: 'canceled', label: 'Canceled', icon: 'bi-x-circle', color: '#dc3545', count: 0 },
    { value: 'rejected', label: 'Rejected', icon: 'bi-x-octagon', color: '#dc3545', count: 0 }
  ];

  // Date range filter
  dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom' = 'week';
  customDateFrom = '';
  customDateTo = '';
  showCustomDatePicker = false;

  // Advanced filters
  searchQuery = '';
  busNumberFilter = '';
  passengerPhoneFilter = '';

  // Sorting
  sortBy: 'CreatedAt' | 'TotalAmount' | 'UpdatedAt' = 'CreatedAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dashboardService: DashboardService,
    private authService: AuthService,
    private restaurantNotificationService: RestaurantNotificationService,
    private adminLocationService: AdminLocationTrackingService
  ) {}

  async ngOnInit() {
    console.log('📋 Orders page initializing...');

    // Subscribe to route params to get status from URL
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const status = params['status'] as OrderStatus;
        if (status && this.isValidStatus(status)) {
          this.currentStatus = status;
        } else {
          this.currentStatus = 'all';
        }
        this.currentPage = 1; // Reset to first page when status changes
        this.loadOrders();
      });

    // Subscribe to query params for additional filters
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(queryParams => {
        if (queryParams['dateRange']) {
          this.dateRange = queryParams['dateRange'];
        }
        if (queryParams['dateFrom']) {
          this.customDateFrom = queryParams['dateFrom'];
        }
        if (queryParams['dateTo']) {
          this.customDateTo = queryParams['dateTo'];
        }
        if (queryParams['page']) {
          this.currentPage = parseInt(queryParams['page'], 10);
        }
      });

    // Initialize real-time updates
    this.initializeRealTimeUpdates();
    
    // Join location tracking group
    const tenantId = this.authService.getTenantId();
    if (tenantId) {
      try {
        await this.adminLocationService.joinRestaurantLocationGroup(tenantId);
        console.log('✅ Joined location tracking group');
      } catch (error) {
        console.error('❌ Error joining location group:', error);
      }
    }
  }

  ngOnDestroy() {
    console.log('🛑 Orders page destroying...');
    
    const tenantId = this.authService.getTenantId();
    if (tenantId) {
      this.adminLocationService.leaveRestaurantLocationGroup(tenantId);
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if status is valid
   */
  private isValidStatus(status: string): boolean {
    return this.statusFilters.some(f => f.value === status);
  }

  /**
   * Get date range for API
   */
  private getDateRange(): { dateFrom?: string; dateTo?: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    switch (this.dateRange) {
      case 'today':
        dateFrom = this.formatDateForAPI(today);
        dateTo = this.formatDateForAPI(today);
        break;
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dateFrom = this.formatDateForAPI(yesterday);
        dateTo = this.formatDateForAPI(yesterday);
        break;
        
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6); // Last 7 days including today
        dateFrom = this.formatDateForAPI(weekAgo);
        dateTo = this.formatDateForAPI(today);
        break;
        
      case 'month':
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFrom = this.formatDateForAPI(firstDayOfMonth);
        dateTo = this.formatDateForAPI(today);
        break;
        
      case 'custom':
        if (this.customDateFrom && this.customDateTo) {
          dateFrom = this.customDateFrom;
          dateTo = this.customDateTo;
        } else {
          // If custom dates not set, default to today
          dateFrom = this.formatDateForAPI(today);
          dateTo = this.formatDateForAPI(today);
        }
        break;
        
      case 'all':
        dateFrom = undefined;
        dateTo = undefined;
        break;
    }

    console.log(`📅 Date Range: ${this.dateRange} | From: ${dateFrom} | To: ${dateTo}`);
    return { dateFrom, dateTo };
  }

  /**
   * Format date for API (YYYY-MM-DD)
   */
  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Load orders from API
   */
  private loadOrders() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) {
      console.error('❌ No tenantId');
      return;
    }

    this.isLoading = true;

    const { dateFrom, dateTo } = this.getDateRange();

    const filters: OrdersFilterParams = {
      tenantId,
      status: this.currentStatus,
      dateFrom,
      dateTo,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      busNumber: this.busNumberFilter || undefined,
      passengerPhone: this.passengerPhoneFilter || undefined,
      passengerName: this.searchQuery || undefined
    };

    this.dashboardService.getOrders(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allOrders = response.items.map(o => this.mapToRecentOrder(o));
          this.filteredOrders = [...this.allOrders];
          this.totalCount = response.totalCount;
          this.totalPages = response.totalPages;
          this.hasPreviousPage = response.hasPreviousPage;
          this.hasNextPage = response.hasNextPage;
          this.updateStatusCounts(response.statusCounts);
          this.isLoading = false;
          console.log(`✅ Loaded ${this.allOrders.length} orders (Page ${this.currentPage}/${this.totalPages})`);
        },
        error: (error) => {
          console.error('❌ Error loading orders:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Map OrderDetail to RecentOrder
   */
  private mapToRecentOrder(order: OrderDetail): RecentOrder {
    return {
      id: order.bookNumber,
      passengerName: order.passengerName,
      busNumber: order.busNumber,
      restaurant: 'Your Restaurant',
      items: order.bookingItems.length,
      amount: order.totalAmount,
      status: this.normalizeStatus(order.bookingStatus),
      time: this.formatTime(order.createdAt),
      bookingId: order.bookingId,
      isUpdating: false,
      showDropdown: false,
      // Include full details for modal
      fullDetails: {
        busName: order.busName,
        startLocationName: order.startLocationName,
        endLocationName: order.endLocationName,
        departureDate: order.departureDate,
        departureTime: order.departureTime,
        passengerPhone: order.passengerPhone,
        passengerEmail: order.passengerEmail,
        bookingStatus: order.bookingStatus,
        totalAmount: order.totalAmount,
        originalAmount: order.originalAmount,
        discountAmount: order.discountAmount,
        subtotal: order.subtotal,
        cgst: order.cgst,
        sgst: order.sgst,
        taxAmount: order.taxAmount,
        deliveryFee: order.deliveryFee,
        paymentStatus: order.paymentStatus,
        promoCode: order.promoCode,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        orderConfirmedAt: order.orderConfirmedAt,
        preparingStartedAt: order.preparingStartedAt,
        readyAt: order.readyAt,
        completedAt: order.completedAt,
        canceledAt: order.canceledAt,
        rejectedAt: order.rejectedAt,
        cancelReason: order.cancelReason,
        rejectReason: order.rejectReason,
        additionalRemarks: order.additionalRemarks,
        pickupLocationAddress: order.pickupLocationAddress,
        pickupLocationLatitude: order.pickupLocationLatitude,
        pickupLocationLongitude: order.pickupLocationLongitude,
        bookingItems: order.bookingItems,
        canceledItems: order.canceledItems
      }
    };
  }

  /**
   * Normalize status
   */
  private normalizeStatus(status: string): RecentOrder['status'] {
    const n = status.toLowerCase();
    if (n === 'delivered' || n === 'completed') return 'completed';
    if (n === 'ready') return 'ready';
    if (n === 'preparing') return 'preparing';
    if (n === 'confirmed') return 'confirmed';
    if (n === 'canceled') return 'canceled';
    if (n === 'rejected') return 'rejected';
    return 'pending';
  }

  /**
   * Update status counts from API response
   */
  private updateStatusCounts(counts: StatusCounts) {
    this.statusFilters.forEach(filter => {
      filter.count = counts[filter.value] || 0;
    });
  }

  /**
   * Change status filter
   */
  changeStatusFilter(status: OrderStatus) {
    this.currentStatus = status;
    this.currentPage = 1; // Reset to first page
    
    // Update URL without reloading
    this.router.navigate(['/admin/orders', status], {
      queryParams: { dateRange: this.dateRange, page: 1 },
      queryParamsHandling: 'merge'
    });

    this.loadOrders();
  }

  /**
   * Change date range filter
   */
  changeDateRange(range: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom') {
    this.dateRange = range;
    this.currentPage = 1; // Reset to first page
    
    // Show custom date picker if custom is selected
    if (range === 'custom') {
      this.showCustomDatePicker = true;
      // Set default dates if not already set
      if (!this.customDateFrom || !this.customDateTo) {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        this.customDateFrom = this.formatDateForAPI(weekAgo);
        this.customDateTo = this.formatDateForAPI(today);
      }
      return; // Don't load orders yet, wait for user to apply custom dates
    } else {
      this.showCustomDatePicker = false;
    }
    
    // Update URL query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dateRange: range, page: 1 },
      queryParamsHandling: 'merge'
    });

    this.loadOrders();
  }

  /**
   * Apply custom date range
   */
  applyCustomDateRange() {
    if (!this.customDateFrom || !this.customDateTo) {
      alert('Please select both start and end dates');
      return;
    }

    // Validate dates
    const fromDate = new Date(this.customDateFrom);
    const toDate = new Date(this.customDateTo);

    if (fromDate > toDate) {
      alert('Start date must be before or equal to end date');
      return;
    }

    this.currentPage = 1;
    this.showCustomDatePicker = false;

    // Update URL query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        dateRange: 'custom',
        dateFrom: this.customDateFrom,
        dateTo: this.customDateTo,
        page: 1 
      },
      queryParamsHandling: 'merge'
    });

    this.loadOrders();
  }

  /**
   * Cancel custom date selection
   */
  cancelCustomDateRange() {
    this.showCustomDatePicker = false;
    this.dateRange = 'week'; // Reset to default
    this.changeDateRange('week');
  }

  /**
   * Change page
   */
  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    
    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge'
    });

    this.loadOrders();
  }

  /**
   * Change page size
   */
  changePageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadOrders();
  }

  /**
   * Apply search filter
   */
  applySearch() {
    this.currentPage = 1;
    this.loadOrders();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.searchQuery = '';
    this.busNumberFilter = '';
    this.passengerPhoneFilter = '';
    this.dateRange = 'week';
    this.customDateFrom = '';
    this.customDateTo = '';
    this.showCustomDatePicker = false;
    this.currentPage = 1;
    
    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dateRange: 'week', page: 1 },
      queryParamsHandling: 'merge'
    });
    
    this.loadOrders();
  }

  /**
   * Handle order updated event
   */
  onOrderUpdated(order: RecentOrder) {
    console.log('✅ Order updated:', order.id);
    this.loadOrders();
  }

  /**
   * Refresh orders
   */
  refreshOrders() {
    console.log('🔄 Refreshing orders...');
    this.loadOrders();
  }

  /**
   * Export orders
   */
  exportOrders() {
    const data = {
      generatedAt: new Date().toISOString(),
      status: this.currentStatus,
      dateRange: this.dateRange,
      totalOrders: this.totalCount,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      orders: this.filteredOrders
    };

    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${this.currentStatus}-${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get current filter
   */
  getCurrentFilter(): StatusFilter {
    return this.statusFilters.find(f => f.value === this.currentStatus) || this.statusFilters[0];
  }

  /**
   * Get pending count for badge
   */
  getPendingCount(): number {
    return this.statusFilters.find(f => f.value === 'pending')?.count || 0;
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  /**
   * Initialize real-time updates
   */
  private async initializeRealTimeUpdates() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    try {
      await this.restaurantNotificationService.startConnection();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.restaurantNotificationService.joinRestaurantGroup(tenantId);

      this.restaurantNotificationService.getOrderStatusUpdates()
        .pipe(takeUntil(this.destroy$))
        .subscribe(update => {
          if (update) {
            this.handleOrderStatusUpdate(update);
          }
        });
    } catch (error) {
      console.error('❌ Error initializing real-time updates:', error);
    }
  }

  /**
   * Handle real-time order status updates
   */
  private handleOrderStatusUpdate(update: DashboardOrderUpdate) {
    const orderIndex = this.allOrders.findIndex(o => o.id === update.orderId);

    if (orderIndex !== -1) {
      this.allOrders[orderIndex].status = this.normalizeStatus(update.status);
      this.allOrders[orderIndex].time = this.formatTime(update.updatedAt);
      this.allOrders[orderIndex].isUpdating = false;
      this.allOrders[orderIndex].showDropdown = false;

      this.filteredOrders = [...this.allOrders];
      console.log('✅ Order updated in real-time:', update.orderId);
    } else {
      // New order or order not in current page, reload
      this.loadOrders();
    }
  }

  /**
   * Format time
   */
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
   * View user location
   */
  viewLocation(order: RecentOrder) {
    const tenantId = this.authService.getTenantId();
    if (!tenantId || !order.bookingId) return;

    this.locationModal.bookingId = order.bookingId;
    this.locationModal.orderId = order.id;
    this.locationModal.tenantId = tenantId;
    this.locationModal.show();
  }

  /**
   * Check if location can be viewed
   */
  canViewLocation(order: RecentOrder): boolean {
    const activeStatuses = ['confirmed', 'preparing', 'ready'];
    return activeStatuses.includes(order.status.toLowerCase());
  }
}

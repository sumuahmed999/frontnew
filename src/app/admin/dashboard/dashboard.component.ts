// src/app/admin/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemToggleComponent } from '../system-toggle/system-toggle.component';
import { Subject, takeUntil } from 'rxjs';
import { OrderNotificationComponent } from '../notification/order-notification/order-notification.component';
import { RecentOrdersComponent, RecentOrder } from '../../components/recent-orders/recent-orders.component';
import { RestaurantNotificationService, DashboardOrderUpdate } from '../../service/restaurant-notification.service';
import { AuthService } from '../../service/auth.service';
import { DashboardService, DashboardStats, RecentBooking, OrdersFilterParams } from '../../service/dashboard.service';
import { UserLocationModalComponent } from '../user-location-modal/user-location-modal.component';
import { AdminLocationTrackingService } from '../../service/admin-location-tracking.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SystemToggleComponent,
    OrderNotificationComponent,
    RecentOrdersComponent,
    UserLocationModalComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild(UserLocationModalComponent) locationModal!: UserLocationModalComponent;
  
  private destroy$ = new Subject<void>();

  // Connection state
  isConnected = false;
  connectionStatus = 'Initializing...';

  // Loading states
  isLoadingStats = false;
  isLoadingOrders = false;

  // Dashboard statistics
  stats: DashboardStats = {
    todaysOrders: 0,
    yesterdaysOrders: 0,
    pendingBookings: 0,
    preparingBookings: 0,
    readyToDeliverBookings: 0,
    completedBookings: 0,
    canceledBookings: 0,
    todaysRevenue: 0,
    yesterdaysRevenue: 0,
    totalRevenue: 0,
    activeRestaurants: 1,
    totalPassengers: 0
  };

  // Recent orders
  recentOrders: RecentOrder[] = [];

  constructor(
    private restaurantNotificationService: RestaurantNotificationService,
    private authService: AuthService,
    private dashboardService: DashboardService,
    private adminLocationService: AdminLocationTrackingService
  ) {}

  async ngOnInit() {
    console.log('🚀 Dashboard initializing...');
    this.loadDashboardData();
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
    console.log('🛑 Dashboard destroying...');

    const tenantId = this.authService.getTenantId();
    if (tenantId) {
      this.restaurantNotificationService.leaveRestaurantGroup(tenantId);
      this.adminLocationService.leaveRestaurantLocationGroup(tenantId);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle order updated event from child component
   */
  onOrderUpdated(order: RecentOrder) {
    console.log('✅ Order updated:', order.id);
    this.loadDashboardData();
  }

  /**
   * Initialize real-time updates via SignalR
   */
  private async initializeRealTimeUpdates() {
    const tenantId = this.authService.getTenantId();

    if (!tenantId) {
      console.error('❌ No tenantId');
      return;
    }

    try {
      console.log('🟡 Initializing real-time updates...');

      await this.restaurantNotificationService.startConnection();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.restaurantNotificationService.joinRestaurantGroup(tenantId);

      this.restaurantNotificationService.getConnectionState()
        .pipe(takeUntil(this.destroy$))
        .subscribe(isConnected => {
          this.isConnected = isConnected;
          this.connectionStatus = isConnected ? 'Connected' : 'Disconnected';
          console.log('📡 Connection:', isConnected ? '🟢' : '🔴');
        });

      this.restaurantNotificationService.getOrderStatusUpdates()
        .pipe(takeUntil(this.destroy$))
        .subscribe(update => {
          if (update) {
            this.handleOrderStatusUpdate(update);
          }
        });

    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  /**
   * Handle real-time order status updates
   */
  private handleOrderStatusUpdate(update: DashboardOrderUpdate) {
    this.updateStatsFromOrderUpdate(update);
    this.updateOrderInList(update);
    console.log('✅ Order updated in real-time:', update.orderId);
  }

  /**
   * Update dashboard stats
   */
  private updateStatsFromOrderUpdate(update: DashboardOrderUpdate) {
    const status = update.status.toLowerCase();

    switch (status) {
      case 'confirmed':
        this.stats.pendingBookings = Math.max(0, this.stats.pendingBookings - 1);
        break;
      case 'preparing':
        this.stats.preparingBookings++;
        break;
      case 'ready':
        this.stats.preparingBookings = Math.max(0, this.stats.preparingBookings - 1);
        this.stats.readyToDeliverBookings++;
        break;
      case 'completed':
        this.stats.readyToDeliverBookings = Math.max(0, this.stats.readyToDeliverBookings - 1);
        this.stats.completedBookings++;
        break;
      case 'canceled':
        this.stats.canceledBookings++;
        this.stats.pendingBookings = Math.max(0, this.stats.pendingBookings - 1);
        this.stats.preparingBookings = Math.max(0, this.stats.preparingBookings - 1);
        break;
      case 'rejected':
        this.stats.canceledBookings++;
        this.stats.pendingBookings = Math.max(0, this.stats.pendingBookings - 1);
        break;
    }
  }

  /**
   * Update order in list
   */
  private updateOrderInList(update: DashboardOrderUpdate) {
    const orderIndex = this.recentOrders.findIndex(o => o.id === update.orderId);

    if (orderIndex !== -1) {
      this.recentOrders[orderIndex].status = this.normalizeStatus(update.status);
      this.recentOrders[orderIndex].time = this.formatTime(update.updatedAt);
      this.recentOrders[orderIndex].isUpdating = false;
      this.recentOrders[orderIndex].showDropdown = false;
    }
  }

  /**
   * Load dashboard data
   */
  private loadDashboardData() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loadStats(tenantId);
    this.loadRecentOrders(tenantId);
  }

  /**
   * Load stats
   */
  private loadStats(tenantId: number) {
    this.isLoadingStats = true;
    this.dashboardService.getDashboardStats(tenantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          this.isLoadingStats = false;
        },
        error: () => {
          this.isLoadingStats = false;
        }
      });
  }

  /**
   * Load orders
   */
  private loadRecentOrders(tenantId: number) {
    this.isLoadingOrders = true;
    
    // Use Orders API to get full details including items
    const filters = {
      tenantId,
      pageNumber: 1,
      pageSize: 10,
      sortBy: 'CreatedAt',
      sortOrder: 'desc' as 'desc'
    };

    this.dashboardService.getOrders(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentOrders = response.items.map(o => this.mapToRecentOrder(o));
          this.isLoadingOrders = false;
        },
        error: () => {
          this.isLoadingOrders = false;
        }
      });
  }

  /**
   * Map OrderDetail to RecentOrder (with full details)
   */
  private mapToRecentOrder(order: any): RecentOrder {
    return {
      id: order.bookNumber,
      passengerName: order.passengerName,
      busNumber: order.busNumber,
      restaurant: 'Your Restaurant',
      items: order.bookingItems?.length || 0,
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
   * Format currency
   */
  formatCurrency(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  /**
   * Calculate percentage
   */
  calculatePercentageChange(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+100' : '0';
    const change = ((current - previous) / previous) * 100;
    return change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
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
   * Reconnect
   */
  reconnect() {
    this.connectionStatus = 'Reconnecting...';
    this.restaurantNotificationService.stopConnection();
    setTimeout(() => {
      this.initializeRealTimeUpdates();
    }, 1000);
  }

  /**
   * Export report
   */
  exportReport() {
    const data = {
      generatedAt: new Date().toISOString(),
      stats: this.stats,
      orders: this.recentOrders
    };

    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Refresh dashboard
   */
  refreshDashboard() {
    const tenantId = this.authService.getTenantId();
    if (tenantId) {
      this.loadDashboardData();
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

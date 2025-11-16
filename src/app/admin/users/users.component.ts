// src/app/admin/users/users.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService, UserDetail, UsersFilterParams, OrdersFilterParams } from '../../service/dashboard.service';
import { AuthService } from '../../service/auth.service';
import { RecentOrdersComponent, RecentOrder } from '../../components/recent-orders/recent-orders.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RecentOrdersComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Math for template
  Math = Math;

  // Users data
  users: UserDetail[] = [];
  isLoading = false;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;
  hasPreviousPage = false;
  hasNextPage = false;

  // Search
  searchQuery = '';

  // Sorting
  sortBy: 'TotalBookings' | 'TotalAmountSpent' | 'LastBookingDate' | 'FirstBookingDate' = 'TotalBookings';
  sortOrder: 'asc' | 'desc' = 'desc';

  // User Details Modal
  showUserDetailsModal = false;
  currentUser: UserDetail | null = null;
  userOrders: RecentOrder[] = [];
  isLoadingUserOrders = false;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('👥 Users page initializing...');
    this.loadUsers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load users from API
   */
  private loadUsers() {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) {
      console.error('❌ No tenantId');
      return;
    }

    this.isLoading = true;

    const filters: UsersFilterParams = {
      tenantId,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      searchQuery: this.searchQuery || undefined
    };

    this.dashboardService.getUsers(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.users = response.items;
          this.totalCount = response.totalCount;
          this.totalPages = response.totalPages;
          this.hasPreviousPage = response.hasPreviousPage;
          this.hasNextPage = response.hasNextPage;
          this.isLoading = false;
          console.log(`✅ Loaded ${this.users.length} users`);
        },
        error: (error) => {
          console.error('❌ Error loading users:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Apply search
   */
  applySearch() {
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * Change page
   */
  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  /**
   * Change page size
   */
  changePageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * Change sorting
   */
  changeSorting(sortBy: 'TotalBookings' | 'TotalAmountSpent' | 'LastBookingDate' | 'FirstBookingDate') {
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'desc';
    }
    this.currentPage = 1;
    this.loadUsers();
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
        pages.push(-1);
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
   * Open user details modal
   */
  async openUserDetailsModal(user: UserDetail) {
    this.currentUser = user;
    this.showUserDetailsModal = true;
    this.isLoadingUserOrders = true;
    this.userOrders = [];

    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    // Fetch user's orders
    const filters: OrdersFilterParams = {
      tenantId,
      passengerName: user.passengerName,
      passengerPhone: user.passengerPhone,
      pageNumber: 1,
      pageSize: 20,
      sortBy: 'CreatedAt',
      sortOrder: 'desc'
    };

    this.dashboardService.getOrders(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.userOrders = response.items.map(order => this.mapToRecentOrder(order));
          this.isLoadingUserOrders = false;
          console.log(`✅ Loaded ${this.userOrders.length} orders for user`);
        },
        error: (error) => {
          console.error('❌ Error loading user orders:', error);
          this.isLoadingUserOrders = false;
        }
      });
  }

  /**
   * Close user details modal
   */
  closeUserDetailsModal() {
    this.showUserDetailsModal = false;
    this.currentUser = null;
    this.userOrders = [];
  }

  /**
   * Map OrderDetail to RecentOrder
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
   * Refresh users
   */
  refreshUsers() {
    console.log('🔄 Refreshing users...');
    this.loadUsers();
  }

  /**
   * Export users
   */
  exportUsers() {
    const data = {
      generatedAt: new Date().toISOString(),
      totalUsers: this.totalCount,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      users: this.users
    };

    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}

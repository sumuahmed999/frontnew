// services/order-tracking.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, throwError, Subject } from 'rxjs';
import { catchError, retry, takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface OrderItem {
  itemName: string;
  quantity: number;
  price: number;
  discountedPrice?: number;
}

export interface DeliveryPersonInfo {
  name: string;
  phone: string;
  id?: string;
  assignedAt?: string;
}

export interface OrderTrackingData {
  bookingId: string;
  orderId: string;
  tenantId?: number; // Added for location tracking
  currentStatus: string;
  busNumber: string;
  busName: string;
  startLocation: string;
  endLocation: string;
  departureDate: string;
  departureTime: string;
  passengerPhone: string;
  items: OrderItem[];
  
  subtotal: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  
  originalAmount: number;
  discountAmount?: number;
  promoCode?: string;
  
  statusHistory: any[];
  cancelReason?: string;
  rejectReason?: string;
  
  // Delivery person info
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  deliveryPersonId?: string;
  assignedAt?: string;
}

export interface OrderStatusUpdate {
  bookingId: string;
  status: string;
  statusMessage: string;
  updatedAt: string;
  additionalInfo?: string;
  details?: {
    cancelReason?: string;
    rejectReason?: string;
    estimatedMinutes?: number;
    estimatedReadyTime?: string;
    deliveryPerson?: {
      name: string;
      phone: string;
      id?: string;
    };
    completedAt?: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderTrackingService implements OnDestroy {
  // ✅ CRITICAL: These URLs must match backend MapHub paths exactly!
  private readonly API_URL = `${environment.apiBaseUrl}/ordertracking`;
  private readonly HUB_URL = `${environment.hubUrl}/orderTrackingHub`; // NO /api prefix!
  
  private hubConnection: signalR.HubConnection | null = null;
  private destroy$ = new Subject<void>();
  
  // Observables
  private orderStatusUpdate$ = new BehaviorSubject<OrderStatusUpdate | null>(null);
  private connectionState$ = new BehaviorSubject<boolean>(false);
  private currentBookingId: string = '';

  constructor(private http: HttpClient) {
    console.log('📦 OrderTrackingService initialized');
  }

  ngOnDestroy() {
    this.stopConnection();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize SignalR connection
   */
  private initializeSignalR() {
    console.log('🔧 Initializing SignalR...');
    
    // ✅ NO skipNegotiation - let SignalR negotiate automatically
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL) // ✅ Exact URL without /api
      .withAutomaticReconnect([0, 2000, 5000, 10000]) // Retry strategy
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupSignalRListeners();
  }

  /**
   * Setup SignalR event listeners
   */
  private setupSignalRListeners() {
    if (!this.hubConnection) return;

    // Listen for order status updates
    this.hubConnection.on('ReceiveOrderStatusUpdate', (update: OrderStatusUpdate) => {
      console.log('📦 Order status update received:', update);
      this.orderStatusUpdate$.next(update);
    });

    // Listen for group join confirmation
    this.hubConnection.on('GroupJoined', (message: string) => {
      console.log('✅ ' + message);
    });

    // Connection events
    this.hubConnection.onreconnecting(() => {
      console.log('🔄 SignalR reconnecting...');
      this.connectionState$.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('✅ SignalR reconnected');
      this.connectionState$.next(true);
      
      // Rejoin the booking group after reconnection
      if (this.currentBookingId) {
        this.joinBookingGroup(this.currentBookingId).catch(err => 
          console.error('Error rejoining group:', err)
        );
      }
    });

    this.hubConnection.onclose(() => {
      console.log('❌ SignalR disconnected');
      this.connectionState$.next(false);
    });
  }

  /**
   * Start SignalR connection
   */
  async startConnection(): Promise<void> {
    if (!this.hubConnection) {
      this.initializeSignalR();
    }

    if (!this.hubConnection) {
      throw new Error('Failed to initialize SignalR connection');
    }

    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
        console.log('🔗 Starting SignalR connection to:', this.HUB_URL);
        await this.hubConnection.start();
        console.log('✅ SignalR connected successfully');
        this.connectionState$.next(true);
      }
    } catch (error) {
      console.error('❌ SignalR connection error:', error);
      this.connectionState$.next(false);
      throw error;
    }
  }

  /**
   * Stop SignalR connection
   */
  async stopConnection(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await this.hubConnection.stop();
        console.log('🛑 SignalR stopped');
        this.connectionState$.next(false);
      } catch (error) {
        console.error('Error stopping SignalR:', error);
      }
    }
  }

  /**
   * Join booking group for real-time updates
   */
  async joinBookingGroup(bookingId: string): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.log('⚠️ SignalR not connected, starting connection...');
      await this.startConnection();
    }

    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Cannot join group - SignalR not connected');
    }

    try {
      this.currentBookingId = bookingId;
      await this.hubConnection.invoke('JoinBookingGroup', bookingId);
      console.log(`✅ Joined booking group: ${bookingId}`);
    } catch (error) {
      console.error('❌ Error joining booking group:', error);
      throw error;
    }
  }

  /**
   * Leave booking group
   */
  async leaveBookingGroup(bookingId: string): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.hubConnection.invoke('LeaveBookingGroup', bookingId);
      console.log(`👋 Left booking group: ${bookingId}`);
      this.currentBookingId = '';
    } catch (error) {
      console.error('Error leaving booking group:', error);
    }
  }

  /**
   * Fetch order tracking data from API
   */
  getOrderTracking(bookingId: string): Observable<ApiResponse<OrderTrackingData>> {
    console.log('📥 Fetching order tracking for:', bookingId);
    return this.http.get<ApiResponse<OrderTrackingData>>(`${this.API_URL}/${bookingId}`)
      .pipe(
        retry(2), // Retry twice on failure
        catchError(this.handleError)
      );
  }

  /**
   * Get observable for order status updates
   */
  getOrderStatusUpdates(): Observable<OrderStatusUpdate | null> {
    return this.orderStatusUpdate$.asObservable();
  }

  /**
   * Get observable for connection state
   */
  getConnectionState(): Observable<boolean> {
    return this.connectionState$.asObservable();
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.status === 404) {
      errorMessage = 'Order not found';
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    console.error('🔴 HTTP Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}

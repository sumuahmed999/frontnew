// services/restaurant-notification.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderItem {
  itemName: string;
  quantity: number;
  price: number;
  discountedPrice?: number;
}

export interface NewOrderNotification {
  bookingId: string;
  orderId: string;
  tenantId: number;
  passengerName: string;
  passengerPhone: string;
  items: OrderItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  discountAmount?: number;
  promoCode?: string;
  busNumber: string;
  busName: string;
  startLocation: string;
  endLocation: string;
  departureDate: string;
  departureTime: string;
  additionalRemarks?: string;
  orderConfirmedAt: string;
}

export interface DashboardOrderUpdate {
  bookingId: string;
  orderId: string;
  passengerName: string;
  busNumber: string;
  status: string;
  statusMessage: string;
  amount: number;
  updatedAt: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantNotificationService implements OnDestroy {
  private readonly HUB_URL = `${environment.hubUrl}/hubs/restaurant-notifications`;
  
  private hubConnection: signalR.HubConnection | null = null;
  private destroy$ = new Subject<void>();
  
  // ✅ Observable for new orders
  private newOrder = new BehaviorSubject<NewOrderNotification | null>(null);
  public newOrder$ = this.newOrder.asObservable();
  
  // Observable for order status updates
  private orderStatusUpdate = new BehaviorSubject<DashboardOrderUpdate | null>(null);
  public orderStatusUpdate$ = this.orderStatusUpdate.asObservable();
  
  // Connection state
  private connectionState = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionState.asObservable();
  
  private currentTenantId: number = 0;
  private isAudioInitialized = false;

  constructor() {
    console.log('🟢 RestaurantNotificationService initialized');
  }

  ngOnDestroy() {
    console.log('🛑 RestaurantNotificationService destroying');
    this.stopConnection();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Request browser notification permission
   */
  requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        console.log('✅ Notification permission already granted');
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('✅ Notification permission granted');
          }
        });
      }
    }
  }

  /**
   * Initialize and start connection
   */
  async startConnection(): Promise<void> {
    console.log('🟡 Starting RestaurantNotificationService connection...');

    if (!this.hubConnection) {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.HUB_URL)
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup listeners
      this.setupListeners();
    }

    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
        await this.hubConnection.start();
        console.log('🟢 RestaurantNotificationService connected');
        this.connectionState.next(true);
      }
    } catch (error) {
      console.error('🔴 Connection error:', error);
      this.connectionState.next(false);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  private setupListeners() {
    if (!this.hubConnection) return;

    console.log('📡 Setting up SignalR listeners...');

    // ✅ Listen for new orders
    this.hubConnection.on('ReceiveNewOrder', (order: NewOrderNotification) => {
      console.log('🔔 New order received:', order);
      this.newOrder.next(order);
      this.showBrowserNotification(order);
      this.playNotificationSound();
    });

    // Listen for order status updates
    this.hubConnection.on('ReceiveOrderStatusUpdate', (update: DashboardOrderUpdate) => {
      console.log('📦 Order status update:', update);
      this.orderStatusUpdate.next(update);
    });

    // Success events
    this.hubConnection.on('JoinSuccess', (response: any) => {
      console.log('🟢 JoinSuccess:', response);
    });

    this.hubConnection.on('LeaveSuccess', (response: any) => {
      console.log('🟢 LeaveSuccess:', response);
    });

    // Error events
    this.hubConnection.on('JoinError', (error: string) => {
      console.error('🔴 JoinError:', error);
    });

    this.hubConnection.on('LeaveError', (error: string) => {
      console.error('🔴 LeaveError:', error);
    });

    // Connection events
    this.hubConnection.onreconnecting(() => {
      console.log('🟡 Reconnecting...');
      this.connectionState.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('🟢 Reconnected');
      this.connectionState.next(true);
      
      // Rejoin group after reconnection
      if (this.currentTenantId > 0) {
        this.joinRestaurantGroup(this.currentTenantId).catch(e => 
          console.error('Error rejoining after reconnection:', e)
        );
      }
    });

    this.hubConnection.onclose(() => {
      console.log('🔴 Connection closed');
      this.connectionState.next(false);
    });
  }

  /**
   * Join restaurant group
   */
  async joinRestaurantGroup(tenantId: number): Promise<void> {
    console.log('🟡 JoinRestaurantGroup called with tenantId:', tenantId);

    if (!this.hubConnection) {
      throw new Error('Connection not initialized');
    }

    if (this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.log('⚠️ Not connected, connecting first...');
      await this.startConnection();
    }

    if (this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Cannot connect to hub');
    }

    try {
      console.log('📤 Invoking JoinRestaurantGroup with tenantId:', tenantId);
      await this.hubConnection.invoke('JoinRestaurantGroup', tenantId);
      this.currentTenantId = tenantId;
      console.log('🟢 Successfully joined restaurant group:', tenantId);
    } catch (error) {
      console.error('🔴 Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave restaurant group
   */
  async leaveRestaurantGroup(tenantId: number): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.log('⚠️ Not connected, skipping leave group');
      return;
    }

    try {
      console.log('👋 Leaving restaurant group:', tenantId);
      await this.hubConnection.invoke('LeaveRestaurantGroup', tenantId);
      this.currentTenantId = 0;
      console.log('🟢 Left restaurant group');
    } catch (error) {
      console.error('🔴 Error leaving group:', error);
    }
  }

  /**
   * Stop connection
   */
  async stopConnection(): Promise<void> {
    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await this.hubConnection.stop();
        console.log('🛑 Connection stopped');
        this.connectionState.next(false);
      } catch (error) {
        console.error('❌ Error stopping connection:', error);
      }
    }
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(order: NewOrderNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🍔 New Order!', {
          body: `Order from ${order.passengerName} - ₹${order.totalAmount}`,
          icon: '/assets/order-icon.png',
          tag: `order-${order.orderId}`,
          requireInteraction: true
        });
        console.log('✅ Browser notification shown');
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }

  /**
   * Play notification sound
   */
  public playNotificationSound() {
    try {
      // Initialize audio on first interaction if needed
      if (!this.isAudioInitialized) {
        this.isAudioInitialized = true;
      }

      const audioContext = new (window as any).AudioContext || new (window as any).webkitAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Notification sound: double beep
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // Second beep
      const oscillator2 = audioContext.createOscillator();
      oscillator2.connect(gainNode);
      oscillator2.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);

      oscillator2.start(audioContext.currentTime + 0.4);
      oscillator2.stop(audioContext.currentTime + 0.7);

      console.log('🔊 Notification sound played');
    } catch (error) {
      console.warn('⚠️ Could not play notification sound:', error);
    }
  }

  /**
   * Stop ringing
   */
  stopRinging() {
    console.log('🔇 Notification sound stopped');
    // Sound auto-stops after duration, this is just for logging
  }

  /**
   * Clear the current new order notification
   */
  clearNewOrderNotification() {
    console.log('🔕 Clearing new order notification');
    this.newOrder.next(null);
  }

  /**
   * Get observables
   */
  getNewOrderUpdates(): Observable<NewOrderNotification | null> {
    return this.newOrder$;
  }

  getOrderStatusUpdates(): Observable<DashboardOrderUpdate | null> {
    return this.orderStatusUpdate$;
  }

  getConnectionState(): Observable<boolean> {
    return this.connectionState$;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }
}

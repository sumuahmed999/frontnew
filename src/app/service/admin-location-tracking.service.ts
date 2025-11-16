// services/admin-location-tracking.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserLocationUpdate {
  bookingId: string;
  tenantId: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminLocationTrackingService implements OnDestroy {
  private readonly HUB_URL = `${environment.hubUrl}/hubs/location-tracking`;
  
  private hubConnection: signalR.HubConnection | null = null;
  private destroy$ = new Subject<void>();
  
  // Map of bookingId -> location data
  private userLocations = new Map<string, UserLocationUpdate>();
  private userLocations$ = new BehaviorSubject<Map<string, UserLocationUpdate>>(new Map());
  private connectionState$ = new BehaviorSubject<boolean>(false);

  constructor() {
    console.log('📍 AdminLocationTrackingService initialized');
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
    console.log('🔧 Initializing Admin Location Tracking SignalR...');
    
    const token = localStorage.getItem('token') || '';
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupSignalRListeners();
  }

  /**
   * Setup SignalR event listeners
   */
  private setupSignalRListeners() {
    if (!this.hubConnection) return;

    // Listen for user location updates
    this.hubConnection.on('ReceiveUserLocation', (locationData: UserLocationUpdate) => {
      console.log('📍 User location received:', locationData);
      
      // Update the map
      this.userLocations.set(locationData.bookingId, locationData);
      
      // Emit updated map
      this.userLocations$.next(new Map(this.userLocations));
    });

    // Listen for user started sharing
    this.hubConnection.on('UserStartedLocationSharing', (data: any) => {
      console.log('🟢 User started sharing location:', data.bookingId);
    });

    // Listen for user stopped sharing
    this.hubConnection.on('UserStoppedLocationSharing', (data: any) => {
      console.log('🔴 User stopped sharing location:', data.bookingId);
      
      // Remove from map
      this.userLocations.delete(data.bookingId);
      this.userLocations$.next(new Map(this.userLocations));
    });

    // Listen for join confirmation
    this.hubConnection.on('JoinedRestaurantLocationGroup', (data: any) => {
      console.log('✅ Joined restaurant location group:', data);
    });

    this.hubConnection.onreconnecting(() => {
      console.log('🔄 Admin Location SignalR reconnecting...');
      this.connectionState$.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('✅ Admin Location SignalR reconnected');
      this.connectionState$.next(true);
    });

    this.hubConnection.onclose(() => {
      console.log('❌ Admin Location SignalR disconnected');
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
        console.log('🔗 Starting Admin Location SignalR connection to:', this.HUB_URL);
        await this.hubConnection.start();
        console.log('✅ Admin Location SignalR connected successfully');
        this.connectionState$.next(true);
      }
    } catch (error) {
      console.error('❌ Admin Location SignalR connection error:', error);
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
        console.log('🛑 Admin Location SignalR stopped');
        this.connectionState$.next(false);
      } catch (error) {
        console.error('Error stopping Admin Location SignalR:', error);
      }
    }
  }

  /**
   * Join restaurant location group to receive all location updates for a tenant
   */
  async joinRestaurantLocationGroup(tenantId: number): Promise<void> {
    try {
      await this.startConnection();

      if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR connection not established');
      }

      await this.hubConnection.invoke('JoinRestaurantLocationGroup', tenantId);
      console.log('✅ Joined restaurant location group for tenant:', tenantId);
    } catch (error) {
      console.error('❌ Error joining restaurant location group:', error);
      throw error;
    }
  }

  /**
   * Leave restaurant location group
   */
  async leaveRestaurantLocationGroup(tenantId: number): Promise<void> {
    try {
      if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
        return;
      }

      await this.hubConnection.invoke('LeaveRestaurantLocationGroup', tenantId);
      console.log('👋 Left restaurant location group for tenant:', tenantId);
      
      // Clear all locations
      this.userLocations.clear();
      this.userLocations$.next(new Map());
    } catch (error) {
      console.error('Error leaving restaurant location group:', error);
    }
  }

  /**
   * Get all user locations observable
   */
  getUserLocations(): Observable<Map<string, UserLocationUpdate>> {
    return this.userLocations$.asObservable();
  }

  /**
   * Get location for specific booking
   */
  getLocationForBooking(bookingId: string): UserLocationUpdate | undefined {
    return this.userLocations.get(bookingId);
  }

  /**
   * Get connection state observable
   */
  getConnectionState(): Observable<boolean> {
    return this.connectionState$.asObservable();
  }

  /**
   * Clear all locations
   */
  clearLocations(): void {
    this.userLocations.clear();
    this.userLocations$.next(new Map());
  }
}

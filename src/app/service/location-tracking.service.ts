// services/location-tracking.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LocationData {
  bookingId: string;
  tenantId: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LocationTrackingService implements OnDestroy {
  private readonly HUB_URL = `${environment.hubUrl}/hubs/location-tracking`;
  
  private hubConnection: signalR.HubConnection | null = null;
  private destroy$ = new Subject<void>();
  private watchId: number | null = null;
  private locationInterval: any = null;
  
  // Observables
  private connectionState$ = new BehaviorSubject<boolean>(false);
  private locationSharing$ = new BehaviorSubject<boolean>(false);
  private currentLocation$ = new BehaviorSubject<LocationData | null>(null);

  constructor() {
    console.log('📍 LocationTrackingService initialized');
  }

  ngOnDestroy() {
    this.stopLocationSharing();
    this.stopConnection();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize SignalR connection
   */
  private initializeSignalR() {
    console.log('🔧 Initializing Location Tracking SignalR...');
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL)
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

    this.hubConnection.on('LocationSharingStarted', (data: any) => {
      console.log('✅ Location sharing started:', data);
      this.locationSharing$.next(true);
    });

    this.hubConnection.on('LocationSharingStopped', (data: any) => {
      console.log('🛑 Location sharing stopped:', data);
      this.locationSharing$.next(false);
    });

    this.hubConnection.on('LocationSharingError', (error: string) => {
      console.error('❌ Location sharing error:', error);
    });

    this.hubConnection.onreconnecting(() => {
      console.log('🔄 Location SignalR reconnecting...');
      this.connectionState$.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('✅ Location SignalR reconnected');
      this.connectionState$.next(true);
    });

    this.hubConnection.onclose(() => {
      console.log('❌ Location SignalR disconnected');
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
        console.log('🔗 Starting Location SignalR connection to:', this.HUB_URL);
        await this.hubConnection.start();
        console.log('✅ Location SignalR connected successfully');
        this.connectionState$.next(true);
      }
    } catch (error) {
      console.error('❌ Location SignalR connection error:', error);
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
        console.log('🛑 Location SignalR stopped');
        this.connectionState$.next(false);
      } catch (error) {
        console.error('Error stopping Location SignalR:', error);
      }
    }
  }

  /**
   * Start sharing location every 1 minute
   */
  async startLocationSharing(bookingId: string, tenantId: number): Promise<void> {
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Start SignalR connection
      await this.startConnection();

      if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR connection not established');
      }

      // Notify server that location sharing started
      await this.hubConnection.invoke('StartLocationSharing', bookingId, tenantId);
      console.log('✅ Location sharing initiated for booking:', bookingId);

      // Get initial location immediately
      await this.shareCurrentLocation(bookingId, tenantId);

      // Set up interval to share location every 1 minute (60000 ms)
      this.locationInterval = setInterval(async () => {
        await this.shareCurrentLocation(bookingId, tenantId);
      }, 60000); // 1 minute

      console.log('📍 Location sharing started - updates every 1 minute');
    } catch (error) {
      console.error('❌ Error starting location sharing:', error);
      throw error;
    }
  }

  /**
   * Share current location
   */
  private async shareCurrentLocation(bookingId: string, tenantId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const locationData: LocationData = {
              bookingId,
              tenantId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date()
            };

            // Update local state
            this.currentLocation$.next(locationData);

            // Send to server via SignalR
            if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
              await this.hubConnection.invoke(
                'ShareLocation',
                bookingId,
                tenantId,
                locationData.latitude,
                locationData.longitude,
                locationData.accuracy
              );

              console.log('📍 Location shared:', {
                lat: locationData.latitude.toFixed(6),
                lng: locationData.longitude.toFixed(6),
                accuracy: locationData.accuracy?.toFixed(2)
              });
            }

            resolve();
          } catch (error) {
            console.error('❌ Error sending location:', error);
            reject(error);
          }
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          let errorMessage = 'Unable to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000 // Cache location for 30 seconds
        }
      );
    });
  }

  /**
   * Stop sharing location
   */
  async stopLocationSharing(bookingId?: string, tenantId?: number): Promise<void> {
    try {
      // Clear interval
      if (this.locationInterval) {
        clearInterval(this.locationInterval);
        this.locationInterval = null;
        console.log('🛑 Location interval cleared');
      }

      // Clear watch
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      // Notify server
      if (this.hubConnection && 
          this.hubConnection.state === signalR.HubConnectionState.Connected &&
          bookingId && tenantId) {
        await this.hubConnection.invoke('StopLocationSharing', bookingId, tenantId);
        console.log('✅ Location sharing stopped on server');
      }

      this.locationSharing$.next(false);
      this.currentLocation$.next(null);
    } catch (error) {
      console.error('Error stopping location sharing:', error);
    }
  }

  /**
   * Get connection state observable
   */
  getConnectionState(): Observable<boolean> {
    return this.connectionState$.asObservable();
  }

  /**
   * Get location sharing state observable
   */
  getLocationSharingState(): Observable<boolean> {
    return this.locationSharing$.asObservable();
  }

  /**
   * Get current location observable
   */
  getCurrentLocation(): Observable<LocationData | null> {
    return this.currentLocation$.asObservable();
  }
}

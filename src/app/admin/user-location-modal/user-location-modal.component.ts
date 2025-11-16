// admin/user-location-modal/user-location-modal.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminLocationTrackingService, UserLocationUpdate } from '../../service/admin-location-tracking.service';
import { SafePipe } from '../../pipes/safe.pipe';

@Component({
  selector: 'app-user-location-modal',
  standalone: true,
  imports: [CommonModule, SafePipe],
  templateUrl: './user-location-modal.component.html',
  styleUrls: ['./user-location-modal.component.scss']
})
export class UserLocationModalComponent implements OnInit, OnDestroy {
  @Input() bookingId: string = '';
  @Input() orderId: string = '';
  @Input() tenantId: number = 0;
  
  private destroy$ = new Subject<void>();
  
  isVisible: boolean = false;
  isLoading: boolean = true;
  locationData: UserLocationUpdate | null = null;
  lastUpdateTime: string = '';
  googleMapsUrl: string = '';
  
  constructor(private adminLocationService: AdminLocationTrackingService) {}

  ngOnInit() {
    // Subscribe to location updates for this booking
    this.adminLocationService.getUserLocations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(locations => {
        const location = locations.get(this.bookingId);
        if (location) {
          this.locationData = location;
          this.updateMapUrl();
          this.updateLastUpdateTime();
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async show() {
    this.isVisible = true;
    this.isLoading = true;

    try {
      // Join restaurant location group if not already joined
      await this.adminLocationService.joinRestaurantLocationGroup(this.tenantId);
      
      // Check if we already have location data
      const existingLocation = this.adminLocationService.getLocationForBooking(this.bookingId);
      if (existingLocation) {
        this.locationData = existingLocation;
        this.updateMapUrl();
        this.updateLastUpdateTime();
        this.isLoading = false;
      } else {
        // Wait for location data
        setTimeout(() => {
          if (!this.locationData) {
            this.isLoading = false;
          }
        }, 5000); // Wait 5 seconds for location data
      }
    } catch (error) {
      console.error('Error showing location modal:', error);
      this.isLoading = false;
    }
  }

  hide() {
    this.isVisible = false;
  }

  private updateMapUrl() {
    if (this.locationData) {
      // Google Maps URL with marker
      this.googleMapsUrl = `https://www.google.com/maps?q=${this.locationData.latitude},${this.locationData.longitude}&z=15&output=embed`;
    }
  }

  private updateLastUpdateTime() {
    if (this.locationData) {
      const updateTime = new Date(this.locationData.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - updateTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        this.lastUpdateTime = 'Just now';
      } else if (diffMins === 1) {
        this.lastUpdateTime = '1 minute ago';
      } else if (diffMins < 60) {
        this.lastUpdateTime = `${diffMins} minutes ago`;
      } else {
        this.lastUpdateTime = updateTime.toLocaleTimeString();
      }
    }
  }

  openInGoogleMaps() {
    if (this.locationData) {
      const url = `https://www.google.com/maps?q=${this.locationData.latitude},${this.locationData.longitude}`;
      window.open(url, '_blank');
    }
  }

  copyCoordinates() {
    if (this.locationData) {
      const coords = `${this.locationData.latitude}, ${this.locationData.longitude}`;
      navigator.clipboard.writeText(coords).then(() => {
        alert('Coordinates copied to clipboard!');
      });
    }
  }

  formatCoordinate(value: number, decimals: number = 6): string {
    return value.toFixed(decimals);
  }

  formatAccuracy(accuracy?: number): string {
    if (!accuracy) return 'N/A';
    return `±${accuracy.toFixed(0)}m`;
  }
}

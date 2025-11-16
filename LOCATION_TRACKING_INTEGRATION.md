# Location Tracking Integration Guide

## Overview
This guide shows how to integrate real-time user location tracking into your application.

## Architecture

### User Side (Order Status Component)
- Automatically starts sharing location when order is in active status (confirmed, preparing, ready)
- Sends location updates every 1 minute
- Stops sharing when order is completed, canceled, or rejected

### Admin Side (Restaurant/Admin Portal)
- Joins restaurant location group to receive all location updates for their tenant
- Displays "View Location" button for active orders
- Shows location on Google Maps in a modal

---

## Files Created

### Backend (.NET)
1. `BusCK/Hubs/LocationTrackingHub.cs` - SignalR hub for location tracking
2. `BusCK/Controllers/LocationTrackingController.cs` - Test API endpoints
3. `BusCK/Extensions/SignalRExtensions.cs` - Helper extension methods
4. `BusCK/LOCATION_TRACKING_HUB.md` - Complete backend documentation

### Frontend (Angular)
1. `frontend/src/app/service/location-tracking.service.ts` - User-side location service
2. `frontend/src/app/service/admin-location-tracking.service.ts` - Admin-side location service
3. `frontend/src/app/admin/user-location-modal/` - Modal component to view locations
4. `frontend/src/app/pipes/safe.pipe.ts` - Pipe for sanitizing iframe URLs

---

## User Side Integration (Already Done)

The `order-status.component.ts` has been updated to:

1. **Auto-start location sharing** for active orders
2. **Send location every 1 minute** via SignalR
3. **Stop sharing** when order completes

### Key Features:
```typescript
// Location sharing starts automatically
private shouldShareLocation(): boolean {
  const activeStatuses = ['confirmed', 'preparing', 'ready'];
  return activeStatuses.includes(this.currentStatus.toLowerCase());
}

// Location updates every 60 seconds
this.locationInterval = setInterval(async () => {
  await this.shareCurrentLocation(bookingId, tenantId);
}, 60000);
```

---

## Admin Side Integration

### Step 1: Add Modal to Your Admin Orders Component

```typescript
// admin-orders.component.ts
import { Component, ViewChild } from '@angular/core';
import { UserLocationModalComponent } from '../user-location-modal/user-location-modal.component';
import { AdminLocationTrackingService } from '../../service/admin-location-tracking.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, UserLocationModalComponent],
  templateUrl: './admin-orders.component.html'
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  @ViewChild(UserLocationModalComponent) locationModal!: UserLocationModalComponent;
  
  orders: any[] = [];
  tenantId: number = 0;
  
  constructor(private adminLocationService: AdminLocationTrackingService) {}
  
  async ngOnInit() {
    // Get tenant ID from auth/storage
    this.tenantId = this.getTenantId();
    
    // Join restaurant location group
    await this.adminLocationService.joinRestaurantLocationGroup(this.tenantId);
    
    // Load orders
    this.loadOrders();
  }
  
  ngOnDestroy() {
    // Leave location group
    this.adminLocationService.leaveRestaurantLocationGroup(this.tenantId);
  }
  
  viewLocation(order: any) {
    this.locationModal.bookingId = order.bookingId;
    this.locationModal.orderId = order.orderId;
    this.locationModal.tenantId = this.tenantId;
    this.locationModal.show();
  }
  
  canViewLocation(order: any): boolean {
    const activeStatuses = ['confirmed', 'preparing', 'ready'];
    return activeStatuses.includes(order.status?.toLowerCase());
  }
  
  private getTenantId(): number {
    // Get from localStorage, auth service, or JWT token
    const tenantId = localStorage.getItem('tenantId');
    return tenantId ? parseInt(tenantId, 10) : 0;
  }
}
```

### Step 2: Add Modal to Template

```html
<!-- admin-orders.component.html -->
<div class="orders-list">
  <table class="table">
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Customer</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let order of orders">
        <td>{{ order.orderId }}</td>
        <td>{{ order.customerName }}</td>
        <td>
          <span class="badge" [class]="'bg-' + getStatusColor(order.status)">
            {{ order.status }}
          </span>
        </td>
        <td>
          <button 
            class="btn btn-sm btn-primary"
            *ngIf="canViewLocation(order)"
            (click)="viewLocation(order)">
            <i class="bi bi-geo-alt-fill me-1"></i>
            View Location
          </button>
          <span *ngIf="!canViewLocation(order)" class="text-muted small">
            Location not available
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Location Modal -->
<app-user-location-modal></app-user-location-modal>
```

---

## Testing

### 1. Test User Side (Order Status Page)

1. Open order status page with an active order
2. Check browser console for:
   ```
   ✅ Location sharing started successfully
   📍 Location shared: { lat: ..., lng: ..., accuracy: ... }
   ```
3. Grant location permission when prompted
4. Location should update every 1 minute

### 2. Test Admin Side

1. Open admin orders page
2. Check console for:
   ```
   ✅ Joined restaurant location group for tenant: X
   ```
3. Click "View Location" button on an active order
4. Modal should show:
   - Google Maps with user's location
   - Latitude/Longitude coordinates
   - Accuracy and last update time

### 3. Test API Endpoints (Optional)

```bash
# Test location update
POST /api/LocationTracking/test-location
Authorization: Bearer {token}
Content-Type: application/json

{
  "bookingId": "your-booking-guid",
  "tenantId": 1,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 10.5
}
```

---

## Configuration

### Environment Variables

Make sure your `environment.ts` has:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'https://your-api.com/api',
  hubUrl: 'https://your-api.com'  // No /api prefix for SignalR
};
```

### CORS Configuration

Backend `Program.cs` already configured with:
```csharp
.AllowCredentials() // Required for SignalR
```

---

## Troubleshooting

### User Not Sharing Location

**Check:**
1. Browser location permission granted
2. Order status is active (confirmed/preparing/ready)
3. TenantId is set correctly
4. Console shows "Location sharing started"

### Admin Not Receiving Updates

**Check:**
1. Admin joined restaurant location group
2. TenantId matches between user and admin
3. SignalR connection established
4. Console shows "Joined restaurant location group"

### Location Not Accurate

**Check:**
1. User device has GPS enabled
2. User is outdoors (better GPS signal)
3. Check `accuracy` value in location data

---

## Security Notes

1. **Authentication**: SignalR hub requires JWT authentication
2. **Tenant Isolation**: Admins only see locations for their tenantId
3. **Privacy**: Location sharing stops automatically when order completes
4. **Permissions**: User must grant browser location permission

---

## Future Enhancements

1. **Real-time Map Updates**: Update map marker without refreshing
2. **Location History**: Store and display location trail
3. **Distance Calculation**: Show distance from restaurant to user
4. **ETA Calculation**: Estimate delivery time based on location
5. **Geofencing**: Alert when user reaches specific locations
6. **Battery Optimization**: Adjust update frequency based on battery level

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify SignalR connection status
3. Test with API endpoints first
4. Review backend logs for SignalR events

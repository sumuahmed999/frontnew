# Order Details Modal - Documentation

## Overview
Added a comprehensive order details modal that displays complete order information when clicking on any order.

## Features

### ✅ Click to View Details
- Click anywhere on the order card/list item to view details
- "X items" text is highlighted as clickable
- Smooth modal animation

### ✅ Order Information Displayed

#### 1. **Order Information**
- Order Number
- Status (with color-coded badge)
- Payment Status
- Created Date/Time

#### 2. **Passenger Information**
- Name
- Phone Number
- Email (if available)

#### 3. **Journey Information**
- Bus Number
- Bus Name
- From Location
- To Location
- Departure Date & Time

#### 4. **Order Items**
Each item shows:
- Item Name
- Category & Subcategory
- Quantity × Price
- Total Price
- Special Instructions (if any)
- Visual bullet points

#### 5. **Canceled Items** (if any)
- Strikethrough styling
- Cancellation reason
- Red highlight

#### 6. **Pricing Details**
- Subtotal
- CGST
- SGST
- Delivery Fee (if applicable)
- Discount (if applicable)
- **Total Amount** (highlighted)

#### 7. **Additional Information**
- Pickup Location Address
- Additional Remarks (if any)

## API Integration

### Endpoint
```
GET https://localhost:7176/api/Booking/{bookingId}
```

### Response Structure
```typescript
{
  bookingId: string;
  bookNumber: string;
  busNumber: string;
  busName: string;
  startLocationName: string;
  endLocationName: string;
  departureDate: string;
  departureTime: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  bookingStatus: string;
  totalAmount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  deliveryFee: number;
  discountAmount: number;
  paymentStatus: string;
  createdAt: string;
  pickupLocationAddress: string;
  additionalRemarks: string | null;
  bookingItems: BookingItemDetail[];
  canceledItems: BookingItemDetail[];
}
```

## UI Components

### Modal Structure
```
┌─────────────────────────────────────┐
│ Order Details                    [×]│
├─────────────────────────────────────┤
│ Order Information                   │
│ Passenger Information               │
│ Journey Information                 │
│ Order Items                         │
│ Canceled Items (if any)             │
│ Pricing Details                     │
│ Pickup Location                     │
│ Additional Remarks                  │
├─────────────────────────────────────┤
│                          [Close]    │
└─────────────────────────────────────┘
```

### Loading States
- Spinner while fetching data
- Error message if fetch fails
- Smooth transitions

### Styling
- Clean, modern design
- Color-coded status badges
- Responsive layout
- Scrollable content
- Backdrop overlay

## Usage

### From List View
```html
<div class="order-info-section" (click)="openOrderDetailsModal(order)">
  <!-- Order info -->
</div>
```

### From Card View
```html
<div class="card-content" (click)="openOrderDetailsModal(order)">
  <!-- Card content -->
</div>
```

### Programmatically
```typescript
this.openOrderDetailsModal(order);
```

## Component Methods

### Open Modal
```typescript
async openOrderDetailsModal(order: RecentOrder): Promise<void>
```
- Fetches order details from API
- Shows loading state
- Handles errors gracefully

### Close Modal
```typescript
closeOrderDetailsModal(): void
```
- Closes modal
- Clears data
- Resets error state

## Styling Classes

### Status Badges
- `.badge-pending` - Yellow
- `.badge-confirmed` - Green
- `.badge-preparing` - Orange
- `.badge-ready` - Blue
- `.badge-completed` - Purple
- `.badge-canceled` - Red
- `.badge-rejected` - Red

### Payment Badges
- `.payment-badge` - Orange (Pending)
- `.payment-badge.paid` - Green (Paid)

### Item Cards
- `.item-card` - Normal item
- `.item-card.canceled` - Canceled item (red tint)

## Responsive Design

### Desktop
- Modal width: 800px max
- Two-column info grid
- Horizontal layout

### Mobile
- Modal width: 95%
- Single-column info grid
- Vertical stacked layout
- Touch-friendly buttons

## Error Handling

### API Errors
- Shows error message in modal
- Allows retry by closing and reopening
- Logs errors to console

### Missing Data
- Gracefully handles null/undefined values
- Conditional rendering for optional fields
- Default values where appropriate

## Accessibility

- ✅ Keyboard navigation
- ✅ Screen reader friendly
- ✅ Focus management
- ✅ ARIA labels
- ✅ Semantic HTML

## Performance

- ✅ Lazy loading (fetches on demand)
- ✅ Caching (stores in component)
- ✅ Smooth animations
- ✅ Optimized rendering

## Summary

The order details modal provides:
- ✅ Complete order information
- ✅ Item-by-item breakdown
- ✅ Pricing transparency
- ✅ Journey details
- ✅ Passenger information
- ✅ Canceled items tracking
- ✅ Special instructions
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states

Click any order to see full details! 🎉

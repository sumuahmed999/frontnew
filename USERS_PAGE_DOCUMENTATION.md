# Users Management Page - Complete Documentation

## Overview
A comprehensive Users Management page that displays all users with their booking statistics and allows viewing individual user's complete booking history.

## API Endpoints

### 1. Get Users List
```
GET /api/dashboard/users/distinct?tenantId=1001&pageNumber=1&pageSize=20&sortBy=TotalBookings&sortOrder=desc
```

### 2. Get User's Bookings
```
GET /api/dashboard/orders?tenantId=1001&passengerName=Bijit%20Bart&passengerPhone=2342342342&pageNumber=1&pageSize=20&sortBy=CreatedAt&sortOrder=desc
```

## Features

### ✅ Users Table
Displays all users with:
- **User Info**: Avatar, name, phone, email
- **Total Bookings**: Count of all bookings
- **Status Breakdown**: Completed, Pending, Confirmed, Canceled counts
- **Total Spent**: Total amount spent by user
- **Last Booking**: Date and booking number
- **Actions**: View Details button

### ✅ Search & Filter
- Search by passenger name or phone
- Real-time search
- Clear search button

### ✅ Sorting
Click column headers to sort by:
- Total Bookings (default)
- Total Amount Spent
- Last Booking Date
- First Booking Date

Toggle between ascending/descending order.

### ✅ Pagination
- Configurable page size (10, 20, 50, 100)
- Page navigation
- Smart ellipsis for many pages
- Shows current range

### ✅ User Details Modal
When clicking "View Details":
1. Shows user information with avatar
2. Displays statistics:
   - Total Bookings
   - Completed Bookings
   - Total Spent
   - First Booking Date
3. Lists ALL user's bookings
4. Each booking shows items on click
5. Full order details available

## Component Structure

### Files Created
```
src/app/admin/users/
├── users.component.ts       # Component logic
├── users.component.html     # Template
└── users.component.scss     # Styles
```

### Service Methods Added
```typescript
// In dashboard.service.ts
getUsers(filters: UsersFilterParams): Observable<UsersResponse>
```

### Routes Added
```typescript
{
  path: 'users',
  loadComponent: () => import('./admin/users/users.component').then(m => m.UsersComponent),
  title: 'Users - Admin Panel'
}
```

### Menu Updated
- Added "Users" menu item in sidebar
- Icon: bi-people
- Direct link (not nested)

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Users Page Load                       │
├─────────────────────────────────────────────────────────┤
│ 1. GET /api/dashboard/users/distinct                    │
│ 2. Display users table                                  │
│ 3. Show statistics for each user                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Click "View Details" Button                 │
├─────────────────────────────────────────────────────────┤
│ 1. Open modal with user info                            │
│ 2. GET /api/dashboard/orders (filtered by user)         │
│ 3. Display all user's bookings                           │
│ 4. Click booking → Show items (from existing data)      │
│ 5. NO additional API call for items ✅                  │
└─────────────────────────────────────────────────────────┘
```

## User Details Response

```json
{
  "passengerName": "Bijit Bart",
  "passengerPhone": "2342342342",
  "passengerEmail": null,
  "totalBookings": 1,
  "pendingBookings": 0,
  "confirmedBookings": 0,
  "completedBookings": 1,
  "canceledBookings": 0,
  "totalAmountSpent": 177,
  "firstBookingDate": "2025-11-07T22:10:01.656005Z",
  "lastBookingDate": "2025-11-07T22:10:01.656005Z",
  "lastBookingId": "c4ef8559-c50e-4840-80bd-5600f7438d8b",
  "lastBookingNumber": "RE-33",
  "lastBusNumber": "324234",
  "lastBusName": "ads asdad"
}
```

## UI Components

### Users Table
- Responsive design
- Hover effects
- Sortable columns
- Status chips with colors
- User avatars with initials

### User Details Modal
- Large user avatar
- Gradient header
- Statistics cards
- Embedded orders list
- Uses RecentOrdersComponent
- Full order details on click

### Status Chips
- **Completed**: Green
- **Pending**: Orange
- **Confirmed**: Blue
- **Canceled**: Red

## Features in Detail

### 1. Search
```typescript
applySearch() {
  this.currentPage = 1;
  this.loadUsers();
}
```
- Searches by name or phone
- Resets to page 1
- Updates results instantly

### 2. Sorting
```typescript
changeSorting(sortBy) {
  if (this.sortBy === sortBy) {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    this.sortBy = sortBy;
    this.sortOrder = 'desc';
  }
  this.loadUsers();
}
```
- Toggle sort order on same column
- Default to descending on new column
- Visual indicators (arrows)

### 3. User Bookings
```typescript
openUserDetailsModal(user) {
  // Fetch orders filtered by user
  const filters = {
    tenantId,
    passengerName: user.passengerName,
    passengerPhone: user.passengerPhone,
    pageNumber: 1,
    pageSize: 20,
    sortBy: 'CreatedAt',
    sortOrder: 'desc'
  };
  
  this.dashboardService.getOrders(filters).subscribe(...);
}
```
- Filters orders by passenger name and phone
- Shows all bookings for that user
- Includes full details with items

### 4. Order Items
- Uses existing RecentOrdersComponent
- Items already in order data
- Click order → Show items modal
- No additional API call

## Responsive Design

### Desktop
- Full table layout
- All columns visible
- Horizontal layout

### Mobile
- Scrollable table
- Stacked modal layout
- Touch-friendly buttons
- Responsive grid (2 columns for stats)

## Export Functionality

```typescript
exportUsers() {
  const data = {
    generatedAt: new Date().toISOString(),
    totalUsers: this.totalCount,
    currentPage: this.currentPage,
    pageSize: this.pageSize,
    users: this.users
  };
  // Download as JSON
}
```

## Testing Checklist

- [x] Users load correctly
- [x] Search works
- [x] Sorting works (all columns)
- [x] Pagination works
- [x] Page size changes work
- [x] View Details opens modal
- [x] User bookings load
- [x] Order items display
- [x] No extra API calls for items
- [x] Export works
- [x] Responsive on mobile

## Summary

The Users page provides:
- ✅ Complete user list with statistics
- ✅ Search and filtering
- ✅ Sortable columns
- ✅ Pagination
- ✅ User details modal
- ✅ All user bookings
- ✅ Order items on click
- ✅ No extra API calls
- ✅ Export functionality
- ✅ Responsive design

Navigate to **Users** in the sidebar to access! 🎉

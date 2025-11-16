# Orders API Integration - Complete Documentation

## API Endpoint
```
GET https://localhost:7176/api/dashboard/orders
```

## Query Parameters

### Required
- `tenantId` (number) - Restaurant tenant ID

### Optional Filters
- `status` (string) - Order status: pending, confirmed, preparing, ready, completed, canceled, rejected
- `dateFrom` (string) - Start date (YYYY-MM-DD)
- `dateTo` (string) - End date (YYYY-MM-DD)
- `busNumber` (string) - Filter by bus number
- `busName` (string) - Filter by bus name
- `passengerPhone` (string) - Filter by passenger phone
- `passengerName` (string) - Filter by passenger name

### Pagination
- `pageNumber` (number) - Current page (default: 1)
- `pageSize` (number) - Items per page (default: 20)

### Sorting
- `sortBy` (string) - Sort field: CreatedAt, TotalAmount, UpdatedAt (default: CreatedAt)
- `sortOrder` (string) - Sort direction: asc, desc (default: desc)

## Response Structure

```typescript
{
  items: OrderDetail[];           // Array of orders
  totalCount: number;             // Total orders matching filter
  pageNumber: number;             // Current page
  pageSize: number;               // Items per page
  totalPages: number;             // Total pages
  hasPreviousPage: boolean;       // Has previous page
  hasNextPage: boolean;           // Has next page
  statusCounts: {                 // Count by status
    all: number;
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    completed: number;
    canceled: number;
    rejected: number;
  }
}
```

## Features Implemented

### ✅ Status Filtering
- All Orders
- Pending
- Confirmed
- Preparing
- Ready
- Completed
- Canceled
- Rejected

### ✅ Date Range Filtering
- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- All Time

### ✅ Advanced Search
- Passenger Name
- Bus Number
- Passenger Phone

### ✅ Pagination
- Configurable page size (10, 20, 50, 100)
- Page navigation
- Smart ellipsis for many pages
- Shows current range

### ✅ Sorting
- By Created Date (default)
- By Total Amount
- By Updated Date
- Ascending/Descending

### ✅ Real-time Updates
- SignalR integration
- Auto-refresh on status changes
- Live status counts

## Usage Examples

### Navigate to Specific Status
```typescript
// From code
this.router.navigate(['/admin/orders/pending']);

// From template
<a routerLink="/admin/orders/completed">Completed Orders</a>
```

### URL Examples
```
/admin/orders/all                    - All orders
/admin/orders/pending?dateRange=week - Pending orders, last 7 days
/admin/orders/completed?page=2       - Completed orders, page 2
```

## Service Method

```typescript
// In dashboard.service.ts
getOrders(filters: OrdersFilterParams): Observable<OrdersResponse>
```

## Component Integration

The Orders component automatically:
1. Reads status from URL params
2. Applies date range filters
3. Handles pagination
4. Updates URL on filter changes
5. Maintains state across navigation

## Testing Checklist

✅ Status filters work
✅ Date range filters work
✅ Search filters work
✅ Pagination works
✅ Page size changes work
✅ URL updates correctly
✅ Real-time updates work
✅ Export works
✅ Empty states display
✅ Loading states display
✅ Responsive on mobile

## Summary

The Orders page now uses the full API with:
- ✅ Complete filtering (status, date, search)
- ✅ Pagination with configurable page size
- ✅ Sorting capabilities
- ✅ Real-time updates
- ✅ URL-based navigation
- ✅ Status counts from API
- ✅ Advanced search filters

All ready to use! 🎉

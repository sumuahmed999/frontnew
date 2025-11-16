# Date Filtering Update - Complete Documentation

## Date Range Options

### 1. **Today**
- Shows orders from today only
- API: `dateFrom=2025-11-08&dateTo=2025-11-08`

### 2. **Yesterday**
- Shows orders from yesterday only
- API: `dateFrom=2025-11-07&dateTo=2025-11-07`

### 3. **Last 7 Days**
- Shows orders from the last 7 days including today
- API: `dateFrom=2025-11-01&dateTo=2025-11-08`

### 4. **This Month**
- Shows orders from the 1st of current month to today
- API: `dateFrom=2025-11-01&dateTo=2025-11-08`

### 5. **Custom Range** ✨ NEW
- User can select custom start and end dates
- Opens a date picker modal
- Validates that start date ≤ end date
- API: `dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

### 6. **All Time**
- Shows all orders without date filtering
- API: No date parameters sent

## Custom Date Range Picker

### Features
- ✅ Calendar input for both dates
- ✅ Visual date picker modal
- ✅ Min/Max validation (start date can't be after end date)
- ✅ Apply/Cancel buttons
- ✅ Persists in URL parameters
- ✅ Responsive design

### Usage Flow
1. User selects "Custom Range" from dropdown
2. Date picker modal appears
3. User selects "From Date" and "To Date"
4. User clicks "Apply"
5. Orders are filtered with custom dates
6. URL updates: `?dateRange=custom&dateFrom=2025-11-01&dateTo=2025-11-08`

### UI Components
```html
<!-- Date picker modal with calendar inputs -->
<div class="custom-date-picker">
  <input type="date" [(ngModel)]="customDateFrom">
  <input type="date" [(ngModel)]="customDateTo">
  <button (click)="applyCustomDateRange()">Apply</button>
</div>
```

## Date Calculation Logic

### Today
```typescript
const today = new Date();
dateFrom = formatDateForAPI(today);  // 2025-11-08
dateTo = formatDateForAPI(today);    // 2025-11-08
```

### Yesterday
```typescript
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
dateFrom = formatDateForAPI(yesterday);  // 2025-11-07
dateTo = formatDateForAPI(yesterday);    // 2025-11-07
```

### Last 7 Days
```typescript
const weekAgo = new Date(today);
weekAgo.setDate(weekAgo.getDate() - 6);  // 6 days ago + today = 7 days
dateFrom = formatDateForAPI(weekAgo);     // 2025-11-01
dateTo = formatDateForAPI(today);         // 2025-11-08
```

### This Month
```typescript
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
dateFrom = formatDateForAPI(firstDayOfMonth);  // 2025-11-01
dateTo = formatDateForAPI(today);              // 2025-11-08
```

### Custom Range
```typescript
dateFrom = customDateFrom;  // User selected
dateTo = customDateTo;      // User selected
```

## API Format

All dates are sent in **YYYY-MM-DD** format:
```
GET /api/dashboard/orders?tenantId=1001&dateFrom=2025-11-01&dateTo=2025-11-08
```

## URL State Management

The date range is persisted in URL:
```
/admin/orders/pending?dateRange=week
/admin/orders/all?dateRange=custom&dateFrom=2025-11-01&dateTo=2025-11-08
```

## Validation

### Custom Date Range
- ✅ Both dates must be selected
- ✅ Start date must be ≤ End date
- ✅ Shows alert if validation fails
- ✅ HTML5 date input with min/max attributes

## Clear Filters

The "Clear Filters" button resets:
- ✅ Date range to "Last 7 Days"
- ✅ Custom dates cleared
- ✅ All search filters cleared
- ✅ Page reset to 1

## Console Logging

Date range changes are logged:
```
📅 Date Range: week | From: 2025-11-01 | To: 2025-11-08
📅 Date Range: custom | From: 2025-10-15 | To: 2025-10-31
```

## Responsive Design

- Desktop: Horizontal date picker layout
- Mobile: Vertical stacked layout
- Date inputs use native browser date picker

## Summary

✅ Today - Single day (today)
✅ Yesterday - Single day (yesterday)
✅ Last 7 Days - 7 days including today
✅ This Month - From 1st of month to today
✅ Custom Range - User selectable with calendar
✅ All Time - No date filtering

All date ranges properly calculate and send correct API parameters! 🎉

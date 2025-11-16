# Environment Configuration Update

## Summary
All hardcoded API URLs (`https://localhost:7176`) have been replaced with environment variables for better configuration management across different environments (development, production, etc.).

## Environment Files Created

### 1. `src/environments/environment.ts` (Development)
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7176',
  apiBaseUrl: 'https://localhost:7176/api',
  hubUrl: 'https://localhost:7176'
};
```

### 2. `src/environments/environment.prod.ts` (Production)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-domain.com',
  apiBaseUrl: 'https://your-production-domain.com/api',
  hubUrl: 'https://your-production-domain.com'
};
```

## Files Updated

### Services (10 files)
1. **src/app/service/auth.service.ts**
   - Changed: `private apiUrl = 'https://localhost:7176'` → `private apiUrl = environment.apiUrl`
   - Changed: `private baseUrl = this.apiUrl + '/api'` → `private baseUrl = environment.apiBaseUrl`

2. **src/app/service/menu-category.service.ts**
   - Changed: `private apiUrl = 'https://localhost:7176/api/MenuCategory'` → `private apiUrl = \`${environment.apiBaseUrl}/MenuCategory\``

3. **src/app/service/stepover.service.ts**
   - Changed: `private baseUrl = 'https://localhost:7176/api/stopover'` → `private baseUrl = \`${environment.apiBaseUrl}/stopover\``

4. **src/app/service/route.service.ts**
   - Changed: `private baseUrl = 'https://localhost:7176'` → `private baseUrl = environment.apiUrl`
   - Changed: `private apiUrl = \`${this.baseUrl}/api/routes\`` → `private apiUrl = \`${environment.apiBaseUrl}/routes\``

5. **src/app/service/restaurant-notification.service.ts**
   - Changed: `private readonly HUB_URL = 'https://localhost:7176/hubs/restaurant-notifications'` → `private readonly HUB_URL = \`${environment.hubUrl}/hubs/restaurant-notifications\``

6. **src/app/service/order-tracking.service.ts**
   - Changed: `private readonly API_URL = \`https://localhost:7176/api/ordertracking\`` → `private readonly API_URL = \`${environment.apiBaseUrl}/ordertracking\``
   - Changed: `private readonly HUB_URL = 'https://localhost:7176/orderTrackingHub'` → `private readonly HUB_URL = \`${environment.hubUrl}/orderTrackingHub\``

7. **src/app/service/menu-subcategory.service.ts**
   - Changed: `private apiUrl = 'https://localhost:7176/api/MenuSubcategory'` → `private apiUrl = \`${environment.apiBaseUrl}/MenuSubcategory\``

8. **src/app/service/menu-item.service.ts**
   - Changed: `public baseUrl = 'https://localhost:7176'` → `public baseUrl = environment.apiUrl`
   - Changed: `public apiUrl = 'https://localhost:7176/api/MenuItem'` → `public apiUrl = \`${environment.apiBaseUrl}/MenuItem\``

9. **src/app/service/location.service.ts**
   - Changed: `private baseUrl = 'https://localhost:7176/api'` → `private baseUrl = environment.apiBaseUrl`

10. **src/app/service/dashboard.service.ts**
    - Changed: `private apiUrl = \`https://localhost:7176/api/dashboard\`` → `private apiUrl = \`${environment.apiBaseUrl}/dashboard\``

### Public Components (8 files)
1. **src/app/public/mobile-verification/mobile-verification.component.ts**
   - Changed: `private readonly API_BASE_URL = 'https://localhost:7176/api'` → `private readonly API_BASE_URL = environment.apiBaseUrl`

2. **src/app/public/track-order/track-order.component.ts**
   - Changed: `private apiUrl = 'https://localhost:7176/api/track-order'` → `private apiUrl = \`${environment.apiBaseUrl}/track-order\``

3. **src/app/public/stop-overs/stop-overs.component.ts**
   - Changed: `private readonly baseUrl = 'https://localhost:7176/api'` → `private readonly baseUrl = environment.apiBaseUrl`

4. **src/app/public/search/search.component.ts**
   - Changed: `private readonly baseUrl = 'https://localhost:7176/api'` → `private readonly baseUrl = environment.apiBaseUrl`

5. **src/app/public/restaurants/restaurants.component.ts**
   - Changed: `private readonly API_BASE_URL = 'https://localhost:7176/api'` → `private readonly API_BASE_URL = environment.apiBaseUrl`
   - Changed: `const baseUrl = 'https://localhost:7176'` → `const baseUrl = environment.apiUrl` (in getRestaurantImage and getRestaurantLogo methods)

6. **src/app/public/order-status/order-status.component.ts**
   - Changed: `private readonly RATING_API_URL = 'https://localhost:7176/api/OrderRating'` → `private readonly RATING_API_URL = \`${environment.apiBaseUrl}/OrderRating\``

7. **src/app/public/menu/menu.component.ts**
   - Changed: `private readonly API_BASE_URL = 'https://localhost:7176/api'` → `private readonly API_BASE_URL = environment.apiBaseUrl`

8. **src/app/public/order-confirmation/order-confirmation.component.ts**
   - Changed: `private readonly API_BASE_URL = 'https://localhost:7176/api'` → `private readonly API_BASE_URL = environment.apiBaseUrl`

### Admin Components (2 files)
1. **src/app/components/recent-orders/recent-orders.component.ts**
   - Changed: `private readonly API_URL = 'https://localhost:7176/api/OrderStatus'` → `private readonly API_URL = \`${environment.apiBaseUrl}/OrderStatus\``

2. **src/app/admin/notification/order-notification/order-notification.component.ts**
   - Changed: `private readonly API_URL = 'https://localhost:7176/api/OrderStatus'` → `private readonly API_URL = \`${environment.apiBaseUrl}/OrderStatus\``

## How to Use

### Development Environment
The application will automatically use `environment.ts` during development:
```bash
ng serve
```

### Production Build
For production builds, update `src/environments/environment.prod.ts` with your production API URL:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourproductiondomain.com',
  apiBaseUrl: 'https://api.yourproductiondomain.com/api',
  hubUrl: 'https://api.yourproductiondomain.com'
};
```

Then build for production:
```bash
ng build --configuration production
```

### Custom Environments
You can create additional environment files for staging, testing, etc.:
- `environment.staging.ts`
- `environment.test.ts`

And configure them in `angular.json` under the `configurations` section.

## Benefits
1. **Centralized Configuration**: All API URLs are now in one place
2. **Environment-Specific**: Easy to switch between dev, staging, and production
3. **No Code Changes**: Change URLs without modifying service/component code
4. **Version Control Safe**: Can use different URLs per environment
5. **Build Optimization**: Angular automatically replaces environment files during build

## Next Steps
1. Update `environment.prod.ts` with your actual production API URL
2. Test the application to ensure all API calls work correctly
3. Consider adding environment files for staging/testing if needed
4. Update your CI/CD pipeline to use appropriate environment configurations

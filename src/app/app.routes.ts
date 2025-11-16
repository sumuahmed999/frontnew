import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { AdminComponent } from './admin/admin/admin.component';
import { AuthGuard } from './core/auth.guard';
import { SettingsComponent } from './admin/settings/settings/settings.component';
import { SearchComponent } from './public/search/search.component';
import { StopOversComponent } from './public/stop-overs/stop-overs.component';
import { RestaurantsComponent } from './public/restaurants/restaurants.component';
import { MenuComponent } from './public/menu/menu.component';
import { MobileVerificationComponent } from './public/mobile-verification/mobile-verification.component';
import { OrderConfirmationComponent } from './public/order-confirmation/order-confirmation.component';
import { OrderStatusComponent } from './public/order-status/order-status.component';

// Import new admin components (you'll need to create these)
import { RouteMasterComponent } from './admin/settings/route-master/route-master.component';
import { MenuCategoryComponent } from './admin/menu/menu-category/menu-category.component';
import { MenuSubcategoryComponent } from './admin/menu/menu-subcategory/menu-subcategory.component';
import { MenuItemComponent } from './admin/menu/menu-item/menu-item.component';
import { PasswordSettingsComponent } from './admin/settings/password-settings/password-settings.component';
import { LocationMasterComponent } from './admin/settings/location-master/location-master.component';
import { RestaurantSettingsComponent } from './admin/settings/restaurant-settings/restaurant-settings.component';

export const routes: Routes = [
  { path: 'search', component: SearchComponent },
  {
    path: 'stop-overs',
    component: StopOversComponent,
    title: 'Food Stops - Travel Food Express'
  },
  {
    path: 'restaurants',
    component: RestaurantsComponent,
    title: 'Restaurants - Travel Food Express'
  },
  {
    path: 'menu',
    component: MenuComponent,
    title: 'Menu - Travel Food Express'
  },
  {
    path: 'mobile-verification',
    component: MobileVerificationComponent,
    title: 'Verify Mobile - Travel Food Express'
  },
  {
    path: 'order-confirmation',
    component: OrderConfirmationComponent,
    title: 'Order Confirmed - Travel Food Express'
  },
  {
    path: 'order-status',
    component: OrderStatusComponent,
    title: 'Track Order - Travel Food Express'
  },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'dashboard', 
        component: DashboardComponent,
        title: 'Dashboard - Admin Panel'
      },
      
      // User Management Routes
      // { 
      //   path: 'users', 
      //   component: AllUsersComponent,
      //   title: 'All Users - Admin Panel'
      // },
      // { 
      //   path: 'users/roles', 
      //   component: UserRolesComponent,
      //   title: 'User Roles - Admin Panel'
      // },
      
      // User Management Routes
      { 
        path: 'users', 
        loadComponent: () => import('./admin/users/users.component').then(m => m.UsersComponent),
        title: 'Users - Admin Panel'
      },
      
      // Order Management Routes
      { 
        path: 'orders', 
        loadComponent: () => import('./admin/orders/orders.component').then(m => m.OrdersComponent),
        title: 'All Orders - Admin Panel'
      },
      { 
        path: 'orders/:status', 
        loadComponent: () => import('./admin/orders/orders.component').then(m => m.OrdersComponent),
        title: 'Orders - Admin Panel'
      },
      
      // Menu Management Routes
      { 
        path: 'menu/categories', 
        component: MenuCategoryComponent,
        title: 'Menu Categories - Admin Panel'
      },
      { 
        path: 'menu/subcategories', 
        component: MenuSubcategoryComponent,
        title: 'Menu Sub Categories - Admin Panel'
      },
      { 
        path: 'menu/items', 
        component: MenuItemComponent,
        title: 'Menu Items - Admin Panel'
      },
      
      // Settings Routes
      { 
        path: 'settings', 
        component: SettingsComponent,
        title: 'Settings - Admin Panel'
      },
      { 
        path: 'settings/change-password', 
        component: PasswordSettingsComponent,
        title: 'Change Password - Admin Panel'
      },
      { 
        path: 'settings/restaurant-info', 
        component: RestaurantSettingsComponent,
        title: 'Restaurant Info - Admin Panel'
      },
      { 
        path: 'settings/location-master', 
        component: LocationMasterComponent,
        title: 'Location Master - Admin Panel'
      },
      { 
        path: 'settings/route-master', 
        component: RouteMasterComponent,
        title: 'Route Master - Admin Panel'
      },
      
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { 
    path: '', 
    loadComponent: () => import('./public/landing/landing.component').then(m => m.LandingComponent),
    title: 'RouteEat - Delicious Food On Your Journey'
  },
  
  // Footer Pages
  {
    path: 'about',
    loadComponent: () => import('./public/about/about.component').then(m => m.AboutComponent),
    title: 'About Us - RouteEat'
  },
  {
    path: 'careers',
    loadComponent: () => import('./public/careers/careers.component').then(m => m.CareersComponent),
    title: 'Careers - RouteEat'
  },
  {
    path: 'contact',
    loadComponent: () => import('./public/contact/contact.component').then(m => m.ContactComponent),
    title: 'Contact Us - RouteEat'
  },
  {
    path: 'help',
    loadComponent: () => import('./public/help/help.component').then(m => m.HelpComponent),
    title: 'Help Center - RouteEat'
  },
  {
    path: 'faq',
    loadComponent: () => import('./public/faq/faq.component').then(m => m.FaqComponent),
    title: 'FAQs - RouteEat'
  },
  {
    path: 'privacy',
    loadComponent: () => import('./public/privacy/privacy.component').then(m => m.PrivacyComponent),
    title: 'Privacy Policy - RouteEat'
  },
  {
    path: 'terms',
    loadComponent: () => import('./public/terms/terms.component').then(m => m.TermsComponent),
    title: 'Terms of Service - RouteEat'
  },
  {
    path: 'partner',
    loadComponent: () => import('./public/partner/partner.component').then(m => m.PartnerComponent),
    title: 'Become a Partner - RouteEat'
  },
  {
    path: 'track-order',
    loadComponent: () => import('./public/track-order/track-order.component').then(m => m.TrackOrderComponent),
    title: 'Track Your Order - RouteEat'
  },
  {
    path: 'refund',
    redirectTo: 'faq',
    pathMatch: 'full'
  },
  {
    path: 'cookies',
    redirectTo: 'privacy',
    pathMatch: 'full'
  },
  {
    path: 'cancellation',
    redirectTo: 'faq',
    pathMatch: 'full'
  },
  
  { path: '**', redirectTo: '' }
];

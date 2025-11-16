import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileSettingsComponent } from '../profile-settings/profile-settings.component';
import { PasswordSettingsComponent } from '../password-settings/password-settings.component';
import { RestaurantSettingsComponent } from '../restaurant-settings/restaurant-settings.component';
import { LocationMasterComponent } from '../location-master/location-master.component';
import { RouteMasterComponent } from '../route-master/route-master.component';
import { TenantMasterComponent } from '../tenant-master/tenant-master.component';
import { LinkStopoverComponent } from '../link-stopover/link-stopover.component';
import { StopOverMasterComponent } from '../stopover-master/stopover-master.component';
import { MenuCategoryComponent } from "../../menu/menu-category/menu-category.component";
import { MenuSubcategoryComponent } from "../../menu/menu-subcategory/menu-subcategory.component";
import { MenuItemComponent } from "../../menu/menu-item/menu-item.component";

interface TabConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ProfileSettingsComponent,
    PasswordSettingsComponent,
    RestaurantSettingsComponent,
    LocationMasterComponent,
    RouteMasterComponent,
    StopOverMasterComponent,
    TenantMasterComponent,
    LinkStopoverComponent,
    MenuCategoryComponent,
    MenuSubcategoryComponent,
    MenuItemComponent
],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  activeTab: string = 'password';
  
  // Control flag for admin tabs
  isAdmin: boolean = false; // Set this based on user role

  ngOnInit() {}

  get availableTabs(): TabConfig[] {
    const baseTabs: TabConfig[] = [
      // { id: 'profile', label: 'Update Profile', icon: 'bi-person', visible: true },
      { id: 'password', label: 'Change Password', icon: 'bi-lock', visible: true },
      { id: 'restaurant', label: 'Restaurant Info', icon: 'bi-shop', visible: true },
      { id: 'menu-category', label: 'Menu Category', icon: 'bi-shop', visible: true },
      { id: 'menu-subcategory', label: 'Menu Sub-Category', icon: 'bi-shop', visible: true },
      { id: 'menu-item', label: 'Menu Items', icon: 'bi-shop', visible: true },
       { id: 'location', label: 'Location Master', icon: 'bi-geo-alt', visible: true },
      { id: 'route', label: 'Route Master', icon: 'bi-map', visible: true},
     
    ];

    const adminTabs: TabConfig[] = [
       { id: 'stopover', label: 'Stopover Master', icon: 'bi-pin-map', visible: this.isAdmin },
      // { id: 'tenant', label: 'Tenant Master', icon: 'bi-building', visible: this.isAdmin },
      // { id: 'link-stopover', label: 'Link Stopover', icon: 'bi-link-45deg', visible: this.isAdmin }
    ];

    return [...baseTabs, ...adminTabs].filter(tab => tab.visible);
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }
}

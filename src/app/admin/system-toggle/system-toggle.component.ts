import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TenantMaster } from '../../core/models/tenant_master';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-system-toggle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="system-toggle-compact">
      <div class="toggle-content">
        <div class="toggle-info">
          <h6 class="toggle-title">System Accessibility</h6>
          <p class="toggle-subtitle">{{ getStatusText() }}</p>
        </div>
        
        <div class="toggle-switch-container">
          <label class="compact-toggle" [class.disabled]="isLoading">
            <input 
              type="checkbox" 
              [checked]="isSystemOnline"
              (change)="toggleSystem()"
              [disabled]="isLoading"
            />
            <span class="toggle-slider" [class.loading]="isLoading">
              <span class="toggle-button">
                <i class="bi" 
                   [class]="isLoading ? 'bi-arrow-repeat spin' : (isSystemOnline ? 'bi-check' : 'bi-x')"></i>
              </span>
            </span>
          </label>
          <div class="status-indicator" [class.online]="isSystemOnline" [class.loading]="isLoading">
            {{ isLoading ? 'Updating...' : (isSystemOnline ? 'Online' : 'Offline') }}
          </div>
        </div>
      </div>
      
      <!-- Error message display -->
      <div class="error-message" *ngIf="errorMessage">
        <i class="bi bi-exclamation-triangle"></i>
        {{ errorMessage }}
      </div>
    </div>
  `,
  styleUrl: './system-toggle.component.scss'
})
export class SystemToggleComponent implements OnInit, OnDestroy {
  isSystemOnline = false;
  isLoading = false;
  errorMessage = '';
  currentTenant: TenantMaster | null = null;

  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadTenantAndStatus();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTenantAndStatus() {
    this.isLoading = true;
    this.errorMessage = '';

    // Load tenant data from API and cache in localStorage
    this.authService.getCurrentTenant()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tenant) => {
          if (tenant) {
            this.currentTenant = tenant;
            this.isSystemOnline = tenant.takeOrders;
            
            // Store tenant data in localStorage for offline access
            localStorage.setItem('currentTenant', JSON.stringify(tenant));
            localStorage.setItem('systemStatus', JSON.stringify(tenant.takeOrders));
            
            console.log(`Loaded tenant: ${tenant.tenantName} (${tenant.tenantCode})`);
          } else {
            this.errorMessage = 'Failed to load tenant information';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load tenant:', error);
          this.isLoading = false;
          
          // Fallback to localStorage if available
          const savedTenant = localStorage.getItem('currentTenant');
          const savedStatus = localStorage.getItem('systemStatus');
          
          if (savedTenant) {
            this.currentTenant = JSON.parse(savedTenant);
          }
          if (savedStatus) {
            this.isSystemOnline = JSON.parse(savedStatus);
          } else {
            this.errorMessage = 'Unable to load restaurant status';
          }
        }
      });
  }

  toggleSystem() {
    if (this.isLoading || !this.currentTenant) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const newValue = !this.isSystemOnline;
    
    this.authService.updateTakeOrdersStatus(newValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.isSystemOnline = newValue;
            
            // Update current tenant object
            if (this.currentTenant) {
              this.currentTenant.takeOrders = newValue;
            }
            
            // Update localStorage
            localStorage.setItem('systemStatus', JSON.stringify(newValue));
            if (this.currentTenant) {
              localStorage.setItem('currentTenant', JSON.stringify(this.currentTenant));
            }
            
            console.log(`${this.currentTenant?.tenantName} is now ${newValue ? 'ACCEPTING ORDERS' : 'NOT ACCEPTING ORDERS'}`);
          } else {
            this.errorMessage = response.message || 'Failed to update status';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to toggle system:', error);
          this.isLoading = false;
          
          // Handle different error types
          if (error.status === 401) {
            this.errorMessage = 'Please login again';
          } else if (error.status === 403) {
            this.errorMessage = 'Permission denied';
          } else {
            this.errorMessage = 'Update failed. Try again.';
          }
        }
      });
  }

  getStatusText(): string {
    const restaurantName = this.currentTenant?.tenantName || 'Restaurant';
    return this.isSystemOnline 
      ? `${restaurantName} is accepting orders` 
      : `${restaurantName} is not accepting orders`;
  }
}

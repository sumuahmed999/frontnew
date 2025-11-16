import { Component, OnInit, OnDestroy, ViewEncapsulation, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

interface Tenant {
  code: string;
  name: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None
}) 
export class LoginComponent implements OnInit, OnDestroy {
  model = {
    tenantCode: '',
    username: '',
    password: ''
  };

  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  selectedTenant: Tenant | null = null;
  loadingTenants = false;
  isLoading = false;
  errorMessage = '';
  rememberMe = false;
  showPassword = false;
  
  // Dropdown state
  isDropdownOpen = false;
  searchTerm = '';
  highlightedIndex = -1;
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {

    this.authService.clearToken();
    this.searchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.filterTenants(term);
    });

    this.loadTenants();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.closeDropdown();
    }
  }

  loadTenants() {
    this.loadingTenants = true;
    this.errorMessage = '';
    
    this.authService.getTenants(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tenants) => {
          this.tenants = tenants;
          this.filteredTenants = [...this.tenants];
          this.loadingTenants = false;
          this.loadRememberedCredentials(); // Load after tenants are loaded
        },
        error: (error) => {
          console.error('Error loading tenants:', error);
          this.errorMessage = 'Failed to load tenants. Please refresh the page.';
          this.loadingTenants = false;
        }
      });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.searchTerm = '';
      this.filteredTenants = [...this.tenants];
      this.highlightedIndex = -1;
    }
  }

  closeDropdown() {
    this.isDropdownOpen = false;
    this.searchTerm = this.selectedTenant ? 
      `${this.selectedTenant.name} (${this.selectedTenant.code})` : '';
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value;
    this.searchSubject.next(searchTerm);
  }

  filterTenants(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredTenants = [...this.tenants];
    } else {
      this.filteredTenants = this.tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    this.highlightedIndex = -1;
  }

  selectTenant(tenant: Tenant) {
    this.selectedTenant = tenant;
    this.model.tenantCode = tenant.code;
    this.searchTerm = `${tenant.name} (${tenant.code})`;
    this.closeDropdown();
  }

  onKeydown(event: KeyboardEvent) {
    if (!this.isDropdownOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredTenants.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0 && this.filteredTenants[this.highlightedIndex]) {
          this.selectTenant(this.filteredTenants[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        this.closeDropdown();
        break;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.isLoading) return;
    
    // Validation
    if (!this.model.tenantCode) {
      this.errorMessage = 'Please select a tenant.';
      return;
    }
    
    if (!this.model.username || !this.model.password) {
      this.errorMessage = 'Please enter both username and password.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';

    const loginRequest = {
      tenantCode: this.model.tenantCode,
      username: this.model.username,
      password: this.model.password
    };

    this.authService.login(loginRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Login successful:', response.message);
          
          // Save token
          this.authService.saveToken(response.token);
          this.authService.saveTenant(this.model.tenantCode);
          
          // Store remember me preference
          if (this.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('username', this.model.username);
            localStorage.setItem('tenantCode', this.model.tenantCode);
          }
          
          // Redirect to dashboard
          this.router.navigate(['/admin/dashboard']);
        },
        error: (error) => {
          console.error('Login failed:', error);
          this.isLoading = false;
          
          if (error.status === 401) {
            this.errorMessage = 'Invalid credentials. Please check your username and password.';
          } else if (error.status === 400) {
            this.errorMessage = error.error?.message || 'Invalid request. Please check your inputs.';
          } else {
            this.errorMessage = 'Login failed. Please try again later.';
          }
        }
      });
  }

  // Load remembered credentials on component init
  loadRememberedCredentials() {
    if (localStorage.getItem('rememberMe') === 'true') {
      this.model.username = localStorage.getItem('username') || '';
      const rememberedTenantCode = localStorage.getItem('tenantCode');
      
      if (rememberedTenantCode) {
        const tenant = this.tenants.find(t => t.code === rememberedTenantCode);
        if (tenant) {
          this.selectTenant(tenant);
        }
      }
      
      this.rememberMe = true;
    }
  }
}

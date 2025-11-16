import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { ProfilePopupComponent } from '../profile-popup/profile-popup.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    SidebarComponent, 
    NotificationPanelComponent,
    ProfilePopupComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  userData: any;
  isSidebarCollapsed = false;
  currentTime = new Date();
  showNotificationPanel = false;
  showProfilePopup = false;

  constructor(private router: Router) {
    const userStr = localStorage.getItem('user');
    this.userData = userStr ? JSON.parse(userStr) : null;
  }

  ngOnInit() {
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    
    // Close profile popup when clicking outside
    if (!target.closest('.header-btn') && !target.closest('.profile-popup')) {
      this.showProfilePopup = false;
    }
  }

  onToggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleNotifications() {
    this.showNotificationPanel = !this.showNotificationPanel;
    // Close profile popup if open
    if (this.showNotificationPanel) {
      this.showProfilePopup = false;
    }
  }

  closeNotificationPanel() {
    this.showNotificationPanel = false;
  }

  toggleProfilePopup() {
    this.showProfilePopup = !this.showProfilePopup;
    // Close notification panel if open
    if (this.showProfilePopup) {
      this.showNotificationPanel = false;
    }
  }

  closeProfilePopup() {
    this.showProfilePopup = false;
  }

  onLogout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('username');
    localStorage.removeItem('auth_token');
    this.router.navigate(['/login']);
  }
}

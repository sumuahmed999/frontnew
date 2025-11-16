import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-popup.component.html',
  styleUrl: './profile-popup.component.scss'
})
export class ProfilePopupComponent {
  @Input() isOpen = false;
  @Input() userData: any;
  @Output() closePopup = new EventEmitter<void>();
  @Output() logoutEvent = new EventEmitter<void>();

  onClose() {
    this.closePopup.emit();
  }

  onLogout() {
    this.logoutEvent.emit();
  }

  onViewProfile() {
    // Navigate to profile page
    console.log('Navigate to profile');
    this.onClose();
  }

  onSettings() {
    // Navigate to settings page
    console.log('Navigate to settings');
    this.onClose();
  }
}

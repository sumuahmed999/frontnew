import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-panel.component.html',
  styleUrl: './notification-panel.component.scss'
})
export class NotificationPanelComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closePanel = new EventEmitter<void>();

  notifications: Notification[] = [
    {
      id: 1,
      title: 'New booking confirmed',
      message: 'Bus #BUS001 - Mumbai to Pune',
      type: 'success',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      title: 'Maintenance reminder',
      message: 'Bus #BUS003 service due tomorrow',
      type: 'warning',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      title: 'New user registered',
      message: 'John Doe joined the platform',
      type: 'info',
      time: '3 hours ago',
      read: true
    },
    {
      id: 4,
      title: 'Payment received',
      message: '₹2,500 received for booking #BK001',
      type: 'success',
      time: '5 hours ago',
      read: true
    },
    {
      id: 5,
      title: 'System alert',
      message: 'High server load detected',
      type: 'error',
      time: '1 day ago',
      read: true
    }
  ];

  ngOnInit() {
    // Auto-close when clicking outside
    if (this.isOpen) {
      setTimeout(() => {
        document.addEventListener('click', this.onDocumentClick.bind(this));
      });
    }
  }

  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-panel')) {
      this.onClose();
    }
  }

  onClose() {
    this.closePanel.emit();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  markAsRead(notification: Notification) {
    notification.read = true;
  }

  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'bi-check-circle-fill text-success';
      case 'warning': return 'bi-exclamation-triangle-fill text-warning';
      case 'info': return 'bi-info-circle-fill text-info';
      case 'error': return 'bi-x-circle-fill text-danger';
      default: return 'bi-bell-fill text-primary';
    }
  }
}

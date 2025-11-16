import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

interface MenuItem {
  path?: string;
  icon: string;
  label: string;
  title: string;
  children?: MenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Input() userData: any;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() logoutEvent = new EventEmitter<void>();

  constructor(private router: Router) {}

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onCloseSidebar() {
    if (window.innerWidth < 992) {
      this.toggleSidebar.emit();
    }
  }

  onLogout() {
    this.logoutEvent.emit();
  }

  toggleSubmenu(item: MenuItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (item.children) {
      // Close other expanded menus first
      this.menuItems.forEach(menuItem => {
        if (menuItem !== item && menuItem.children) {
          menuItem.expanded = false;
        }
      });
      
      // Toggle current menu
      item.expanded = !item.expanded;
      
      // Only expand sidebar on desktop when collapsed
      if (this.isCollapsed && item.expanded && window.innerWidth >= 992) {
        this.onToggleSidebar();
      }
    }
  }

  // Check if any child menu is active
  isParentActive(item: MenuItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => 
      child.path && this.router.url.includes(child.path)
    );
  }

  // Initialize expanded state for parent menus with active children
  ngOnInit() {
    this.menuItems.forEach(item => {
      if (item.children && this.isParentActive(item)) {
        item.expanded = true;
      }
    });
  }

  menuItems: MenuItem[] = [
    { 
      path: '/admin/dashboard', 
      icon: 'bi-speedometer2', 
      label: 'Dashboard',
      title: 'Dashboard Overview'
    },
    { 
      path: '/admin/users', 
      icon: 'bi-people', 
      label: 'Users',
      title: 'User Management'
    },
    { 
      icon: 'bi-menu-button-wide', 
      label: 'Menu',
      title: 'Menu Management',
      expanded: false,
      children: [
        { 
          path: '/admin/menu/categories', 
          icon: 'bi-collection', 
          label: 'Menu Category',
          title: 'Manage Menu Categories'
        },
        { 
          path: '/admin/menu/subcategories', 
          icon: 'bi-diagram-3', 
          label: 'Sub Category',
          title: 'Manage Sub Categories'
        },
        { 
          path: '/admin/menu/items', 
          icon: 'bi-card-list', 
          label: 'Menu Items',
          title: 'Manage Menu Items'
        }
      ]
    },
    { 
      icon: 'bi-bag-check', 
      label: 'Order Management',
      title: 'Order Management',
      expanded: false,
      children: [
        { 
          path: '/admin/orders/all', 
          icon: 'bi-list-ul', 
          label: 'All Orders',
          title: 'View All Orders'
        },
        { 
          path: '/admin/orders/pending', 
          icon: 'bi-clock', 
          label: 'Pending',
          title: 'Pending Orders'
        },
        { 
          path: '/admin/orders/confirmed', 
          icon: 'bi-check-circle', 
          label: 'Confirmed',
          title: 'Confirmed Orders'
        },
        { 
          path: '/admin/orders/preparing', 
          icon: 'bi-fire', 
          label: 'Preparing',
          title: 'Preparing Orders'
        },
        { 
          path: '/admin/orders/ready', 
          icon: 'bi-box-seam', 
          label: 'Ready',
          title: 'Ready for Delivery'
        },
        { 
          path: '/admin/orders/completed', 
          icon: 'bi-check2-all', 
          label: 'Completed',
          title: 'Completed Orders'
        },
        { 
          path: '/admin/orders/canceled', 
          icon: 'bi-x-circle', 
          label: 'Canceled',
          title: 'Canceled Orders'
        },
        { 
          path: '/admin/orders/rejected', 
          icon: 'bi-x-octagon', 
          label: 'Rejected',
          title: 'Rejected Orders'
        }
      ]
    },
    // { 
    //   icon: 'bi-graph-up', 
    //   label: 'Reports',
    //   title: 'Reports & Analytics',
    //   expanded: false,
    //   children: [
    //     { 
    //       path: '/admin/reports/sales', 
    //       icon: 'bi-currency-dollar', 
    //       label: 'Sales Report',
    //       title: 'Sales Reports'
    //     },
    //     { 
    //       path: '/admin/reports/orders', 
    //       icon: 'bi-bar-chart', 
    //       label: 'Order Report',
    //       title: 'Order Reports'
    //     },
    //     { 
    //       path: '/admin/reports/revenue', 
    //       icon: 'bi-cash-stack', 
    //       label: 'Revenue Report',
    //       title: 'Revenue Reports'
    //     },
    //     { 
    //       path: '/admin/reports/users', 
    //       icon: 'bi-people-fill', 
    //       label: 'User Report',
    //       title: 'User Reports'
    //     },
    //     { 
    //       path: '/admin/reports/analytics', 
    //       icon: 'bi-pie-chart', 
    //       label: 'Analytics Dashboard',
    //       title: 'Analytics Dashboard'
    //     }
    //   ]
    // },
    { 
      icon: 'bi-gear', 
      label: 'Settings',
      title: 'System Settings',
      expanded: false,
      children: [
        { 
          path: '/admin/settings/change-password', 
          icon: 'bi-key', 
          label: 'Change Password',
          title: 'Change Password'
        },
        { 
          path: '/admin/settings/restaurant-info', 
          icon: 'bi-shop', 
          label: 'Restaurant Info',
          title: 'Restaurant Information'
        },
        { 
          path: '/admin/settings/location-master', 
          icon: 'bi-geo-alt', 
          label: 'Location Master',
          title: 'Location Master'
        },
        { 
          path: '/admin/settings/route-master', 
          icon: 'bi-signpost', 
          label: 'Route Master',
          title: 'Route Master'
        }
      ]
    }
  ];
}

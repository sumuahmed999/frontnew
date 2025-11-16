import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss'
})
export class HelpComponent implements OnInit {
  categories = [
    {
      icon: 'bi-cart-check',
      title: 'Ordering',
      description: 'How to place and manage orders',
      link: '/faq#ordering'
    },
    {
      icon: 'bi-credit-card',
      title: 'Payments',
      description: 'Payment methods and refunds',
      link: '/faq#payments'
    },
    {
      icon: 'bi-truck',
      title: 'Delivery',
      description: 'Delivery process and tracking',
      link: '/faq#delivery'
    },
    {
      icon: 'bi-person-circle',
      title: 'Account',
      description: 'Manage your account settings',
      link: '/faq#account'
    }
  ];

  ngOnInit() {
    window.scrollTo(0, 0);
  }
}

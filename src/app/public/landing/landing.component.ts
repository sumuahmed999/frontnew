// src/app/public/landing/landing.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  features = [
    {
      icon: 'bi-geo-alt-fill',
      title: 'Track Your Journey',
      description: 'Real-time bus tracking and location updates throughout your trip'
    },
    {
      icon: 'bi-basket-fill',
      title: 'Order On-the-Go',
      description: 'Browse menus and order delicious food while traveling'
    },
    {
      icon: 'bi-clock-fill',
      title: 'Quick Delivery',
      description: 'Get your food delivered right to your seat at designated stops'
    },
    {
      icon: 'bi-credit-card-fill',
      title: 'Easy Payment',
      description: 'Secure and hassle-free payment options for your convenience'
    },
    {
      icon: 'bi-star-fill',
      title: 'Quality Food',
      description: 'Partner restaurants serving fresh and hygienic meals'
    },
    {
      icon: 'bi-headset',
      title: '24/7 Support',
      description: 'Round-the-clock customer support for any assistance'
    }
  ];

  stats = [
    { value: '10,000+', label: 'Happy Travelers' },
    { value: '500+', label: 'Partner Restaurants' },
    { value: '50+', label: 'Routes Covered' },
    { value: '4.8★', label: 'Average Rating' }
  ];

  testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Frequent Traveler',
      image: 'PS',
      text: 'RouteEat has transformed my long bus journeys! No more worrying about food stops.',
      rating: 5
    },
    {
      name: 'Rajesh Kumar',
      role: 'Business Traveler',
      image: 'RK',
      text: 'Amazing service! Fresh food delivered right to my seat. Highly recommended!',
      rating: 5
    },
    {
      name: 'Anita Desai',
      role: 'Student',
      image: 'AD',
      text: 'Affordable and convenient. Perfect for students traveling home on weekends.',
      rating: 5
    }
  ];

  mobileMenuOpen = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Add scroll animations
    this.setupScrollAnimations();
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  private setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1 });

    setTimeout(() => {
      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
      });
    }, 100);
  }

  navigateToSearch() {
    this.router.navigate(['/search']);
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent implements OnInit {
  faqCategories = [
    {
      id: 'ordering',
      title: 'Ordering & Booking',
      faqs: [
        {
          question: 'How do I place an order?',
          answer: 'Search for your bus route, browse available restaurants, select items, and place your order. You will receive confirmation via SMS.',
          open: false
        },
        {
          question: 'Can I modify my order after placing it?',
          answer: 'Orders can be modified within 15 minutes of placement. Contact our support team immediately for assistance.',
          open: false
        },
        {
          question: 'What if my bus doesn\'t stop at the delivery location?',
          answer: 'We coordinate with bus operators for designated stops. If there\'s an issue, you\'ll receive a full refund automatically.',
          open: false
        }
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Refunds',
      faqs: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit/debit cards, UPI, net banking, and digital wallets like Paytm, PhonePe, and Google Pay.',
          open: false
        },
        {
          question: 'Is my payment information secure?',
          answer: 'Yes, we use industry-standard encryption and work with certified payment partners to ensure complete security.',
          open: false
        },
        {
          question: 'How do refunds work?',
          answer: 'Refunds are processed within 5-7 business days to your original payment method. You\'ll receive email confirmation.',
          open: false
        }
      ]
    },
    {
      id: 'delivery',
      title: 'Delivery & Tracking',
      faqs: [
        {
          question: 'How do I track my order?',
          answer: 'You can track your order in real-time through our platform. You\'ll also receive SMS updates at each stage.',
          open: false
        },
        {
          question: 'What if I miss the delivery?',
          answer: 'If you miss the delivery at the designated stop, contact support immediately. We\'ll try to arrange delivery at the next stop.',
          open: false
        },
        {
          question: 'How is the food delivered to my seat?',
          answer: 'Our delivery partner will board the bus at the designated stop and deliver your order directly to your seat number.',
          open: false
        }
      ]
    }
  ];

  ngOnInit() {
    window.scrollTo(0, 0);
  }

  toggleFaq(categoryId: string, index: number) {
    const category = this.faqCategories.find(c => c.id === categoryId);
    if (category) {
      category.faqs[index].open = !category.faqs[index].open;
    }
  }
}

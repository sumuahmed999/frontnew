import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-partner',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './partner.component.html',
  styleUrl: './partner.component.scss'
})
export class PartnerComponent implements OnInit {
  partnerForm = {
    restaurantName: '',
    ownerName: '',
    email: '',
    phone: '',
    location: '',
    message: ''
  };

  isSubmitting = false;
  isSubmitted = false;

  ngOnInit() {
    window.scrollTo(0, 0);
  }

  onSubmit() {
    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.isSubmitted = true;
      this.resetForm();
      setTimeout(() => this.isSubmitted = false, 5000);
    }, 2000);
  }

  resetForm() {
    this.partnerForm = {
      restaurantName: '',
      ownerName: '',
      email: '',
      phone: '',
      location: '',
      message: ''
    };
  }
}

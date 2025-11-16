import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  contactForm = {
    name: '',
    email: '',
    subject: '',
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
    this.contactForm = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
  }
}

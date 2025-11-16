import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.scss'
})
export class ProfileSettingsComponent implements OnInit {
  profileForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      address: ['']
    });
  }

  onSubmit() {
    if (this.profileForm.valid) {
      console.log('Profile form submitted:', this.profileForm.value);
      // Handle form submission here
    }
  }
}

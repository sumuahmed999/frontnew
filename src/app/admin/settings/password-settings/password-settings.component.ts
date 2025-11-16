import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../service/auth.service';
import { ChangePasswordRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-password-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './password-settings.component.html',
  styleUrl: './password-settings.component.scss'
})
export class PasswordSettingsComponent implements OnInit {
  passwordForm!: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  
  // Password visibility toggles
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {}

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-zA-Z])(?=.*\d).*$/) // At least one letter and one number
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Custom validator for password match
  passwordMatchValidator(control: AbstractControl): {[key: string]: any} | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword?.hasError('passwordMismatch')) {
      delete confirmPassword.errors!['passwordMismatch'];
      if (Object.keys(confirmPassword.errors!).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  // Password visibility toggles
  toggleCurrentPassword() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Password strength checking
  onPasswordStrengthCheck() {
    // Trigger form validation
    this.passwordForm.updateValueAndValidity();
  }

  getPasswordStrengthPercent(): number {
    const password = this.passwordForm.get('newPassword')?.value || '';
    let strength = 0;
    
    if (password.length >= 6) strength += 25;
    if (password.match(/[a-zA-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 25;
    
    return strength;
  }

  getPasswordStrengthClass(): string {
    const percent = this.getPasswordStrengthPercent();
    if (percent <= 25) return 'strength-weak';
    if (percent <= 50) return 'strength-fair';
    if (percent <= 75) return 'strength-good';
    return 'strength-strong';
  }

  getPasswordStrengthText(): string {
    const percent = this.getPasswordStrengthPercent();
    if (percent <= 25) return 'Weak';
    if (percent <= 50) return 'Fair';
    if (percent <= 75) return 'Good';
    return 'Strong';
  }

  getRequirementClass(requirement: string): string {
    const password = this.passwordForm.get('newPassword')?.value || '';
    let met = false;
    
    switch (requirement) {
      case 'length':
        met = password.length >= 6;
        break;
      case 'letters':
        met = /[a-zA-Z]/.test(password);
        break;
      case 'numbers':
        met = /[0-9]/.test(password);
        break;
      case 'special':
        met = /[^a-zA-Z0-9]/.test(password);
        break;
    }
    
    return met ? 'requirement-met' : 'requirement-unmet';
  }

  onSubmit() {
    if (this.passwordForm.valid) {
      const userId = this.authService.getCurrentUserId();
      
      if (!userId) {
        this.errorMessage = 'User not logged in. Please log in again.';
        return;
      }

      // Check if passwords match (additional client-side validation)
      const newPassword = this.passwordForm.get('newPassword')?.value;
      const confirmPassword = this.passwordForm.get('confirmPassword')?.value;
      
      if (newPassword !== confirmPassword) {
        this.errorMessage = 'New password and confirm password do not match.';
        return;
      }

      // Reset messages and start loading
      this.clearMessages();
      this.isLoading = true;

      const request: ChangePasswordRequest = {
        oldPassword: this.passwordForm.get('currentPassword')?.value,
        newPassword: newPassword
      };

      this.authService.changePassword(userId, request).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = response.message || 'Password changed successfully! You will be logged out from all devices.';
          this.resetForm(); // Use resetForm instead of just passwordForm.reset()
        },
        error: (error) => {
          this.isLoading = false;
          
          // Handle different error types
          if (error.status === 400) {
            this.errorMessage = error.error?.message || error.error || 'Old password is incorrect.';
          } else if (error.status === 401) {
            this.errorMessage = 'Unauthorized. Please log in again.';
          } else if (error.status === 404) {
            this.errorMessage = 'User not found.';
          } else if (error.status === 500) {
            this.errorMessage = 'Server error. Please try again later.';
          } else if (error.status === 0) {
            this.errorMessage = 'Network error. Please check your connection.';
          } else {
            this.errorMessage = 'Failed to change password. Please try again.';
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.passwordForm.controls).forEach(key => {
        this.passwordForm.get(key)?.markAsTouched();
      });
    }
  }

  resetForm() {
    this.passwordForm.reset();
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    this.clearMessages();
    
    // Reset form validation state
    Object.keys(this.passwordForm.controls).forEach(key => {
      this.passwordForm.get(key)?.markAsUntouched();
      this.passwordForm.get(key)?.markAsPristine();
    });
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }
}

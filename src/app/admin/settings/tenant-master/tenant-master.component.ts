import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-tenant-master',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './tenant-master.component.html',
  styleUrl: './tenant-master.component.scss'
})
export class TenantMasterComponent implements OnInit {
  tenantForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.tenantForm = this.fb.group({
      tenantName: ['', Validators.required],
      contactPerson: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      subscriptionType: ['basic'],
      isActive: [true]
    });
  }

  onSubmit() {
    if (this.tenantForm.valid) {
      console.log('Tenant form submitted:', this.tenantForm.value);
      // Handle form submission here
    }
  }
}

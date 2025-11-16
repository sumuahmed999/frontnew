import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-link-stopover',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './link-stopover.component.html',
  styleUrl: './link-stopover.component.scss'
})
export class LinkStopoverComponent implements OnInit {
  linkStopoverForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.linkStopoverForm = this.fb.group({
      routeId: ['', Validators.required],
      stopoverId: ['', Validators.required],
      sequence: ['', [Validators.required, Validators.min(1)]],
      arrivalTime: [''],
      departureTime: ['']
    });
  }

  onSubmit() {
    if (this.linkStopoverForm.valid) {
      console.log('Link stopover form submitted:', this.linkStopoverForm.value);
      // Handle form submission here
    }
  }
}

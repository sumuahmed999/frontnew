import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss'
})
export class CareersComponent implements OnInit {
  openings = [
    {
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      location: 'Bangalore, India',
      type: 'Full-time',
      description: 'Build scalable solutions for millions of travelers'
    },
    {
      title: 'Product Manager',
      department: 'Product',
      location: 'Mumbai, India',
      type: 'Full-time',
      description: 'Drive product strategy and roadmap'
    },
    {
      title: 'Operations Manager',
      department: 'Operations',
      location: 'Delhi, India',
      type: 'Full-time',
      description: 'Manage restaurant partnerships and logistics'
    },
    {
      title: 'UI/UX Designer',
      department: 'Design',
      location: 'Bangalore, India',
      type: 'Full-time',
      description: 'Create delightful user experiences'
    }
  ];

  ngOnInit() {
    window.scrollTo(0, 0);
  }
}

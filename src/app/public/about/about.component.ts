import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  stats = [
    { value: '10,000+', label: 'Happy Travelers' },
    { value: '500+', label: 'Partner Restaurants' },
    { value: '50+', label: 'Routes Covered' }
  ];

  ngOnInit() {
    window.scrollTo(0, 0);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent implements OnInit {
  lastUpdated = 'January 15, 2025';

  ngOnInit() {
    window.scrollTo(0, 0);
  }
}

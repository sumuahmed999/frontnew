import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss'
})
export class TermsComponent implements OnInit {
  lastUpdated = 'January 15, 2025';

  ngOnInit() {
    window.scrollTo(0, 0);
  }
}

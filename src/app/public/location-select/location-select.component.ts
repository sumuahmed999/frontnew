// src/app/components/location-select/location-select.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LocationModel } from '../../core/models/location-search.models';

@Component({
  selector: 'app-location-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-select.component.html',
  styleUrl: './location-select.component.scss'
})
export class LocationSelectComponent implements OnInit, OnDestroy, OnChanges {
  @Input() label: string = 'Select Location';
  @Input() placeholder: string = 'Search locations...';
  @Input() selectedLocation: LocationModel | null = null;
  @Input() locations: LocationModel[] = [];
  @Input() disabled: boolean = false;
  @Output() locationSelected = new EventEmitter<LocationModel>();

  searchTerm: string = '';
  isOpen: boolean = false;
  filteredLocations: LocationModel[] = [];
  
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | undefined;

  ngOnInit() {
    this.filteredLocations = [...this.locations];

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.filterLocations(searchTerm);
    });

    if (this.selectedLocation) {
      this.searchTerm = this.selectedLocation.name;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['locations'] && changes['locations'].currentValue) {
      this.filteredLocations = [...this.locations];
      
      if (this.searchTerm) {
        this.filterLocations(this.searchTerm);
      }
    }

    if (changes['selectedLocation'] && changes['selectedLocation'].currentValue) {
      this.searchTerm = this.selectedLocation?.name || '';
    }

    if (changes['locations'] && 
        changes['locations'].previousValue && 
        changes['locations'].previousValue.length > 0 && 
        changes['locations'].currentValue.length === 0) {
      this.searchTerm = '';
      this.selectedLocation = null;
    }
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  trackByLocationId(index: number, location: LocationModel): number {
    return location.id;
  }

  onSearch() {
    if (!this.disabled) {
      this.searchSubject.next(this.searchTerm);
    }
  }

  private filterLocations(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredLocations = [...this.locations];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredLocations = this.locations.filter(location =>
      location.name.toLowerCase().includes(term) ||
      (location.state && location.state.toLowerCase().includes(term)) ||
      (location.code && location.code.toLowerCase().includes(term))
    );
  }

  openDropdown() {
    if (!this.disabled) {
      this.isOpen = true;
      this.filterLocations(this.searchTerm);
    }
  }

  closeDropdown() {
    setTimeout(() => {
      this.isOpen = false;
    }, 150);
  }

  selectLocation(location: LocationModel) {
    if (!this.disabled) {
      this.selectedLocation = location;
      this.searchTerm = location.name;
      this.isOpen = false;
      this.locationSelected.emit(location);
    }
  }

  clearSelection() {
    if (!this.disabled) {
      this.selectedLocation = null;
      this.searchTerm = '';
      this.filteredLocations = [...this.locations];
      this.locationSelected.emit(null as any);
    }
  }
}

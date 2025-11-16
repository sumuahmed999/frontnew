import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantSettingsComponent } from './restaurant-settings.component';

describe('RestaurantSettingsComponent', () => {
  let component: RestaurantSettingsComponent;
  let fixture: ComponentFixture<RestaurantSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

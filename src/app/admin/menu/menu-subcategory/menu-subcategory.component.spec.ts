import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuSubcategoryComponent } from './menu-subcategory.component';

describe('MenuSubcategoryComponent', () => {
  let component: MenuSubcategoryComponent;
  let fixture: ComponentFixture<MenuSubcategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuSubcategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuSubcategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

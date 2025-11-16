import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemToggleComponent } from './system-toggle.component';

describe('SystemToggleComponent', () => {
  let component: SystemToggleComponent;
  let fixture: ComponentFixture<SystemToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemToggleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

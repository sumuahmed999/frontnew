import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopOversComponent } from './stop-overs.component';

describe('StopOversComponent', () => {
  let component: StopOversComponent;
  let fixture: ComponentFixture<StopOversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopOversComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopOversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopoverMasterComponent } from './stopover-master.component';

describe('StopoverMasterComponent', () => {
  let component: StopoverMasterComponent;
  let fixture: ComponentFixture<StopoverMasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopoverMasterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopoverMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantMasterComponent } from './tenant-master.component';

describe('TenantMasterComponent', () => {
  let component: TenantMasterComponent;
  let fixture: ComponentFixture<TenantMasterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantMasterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantMasterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

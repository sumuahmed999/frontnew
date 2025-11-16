import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkStopoverComponent } from './link-stopover.component';

describe('LinkStopoverComponent', () => {
  let component: LinkStopoverComponent;
  let fixture: ComponentFixture<LinkStopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkStopoverComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinkStopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

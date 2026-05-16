import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Handover } from './handover';

describe('Handover', () => {
  let component: Handover;
  let fixture: ComponentFixture<Handover>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Handover],
    }).compileComponents();

    fixture = TestBed.createComponent(Handover);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

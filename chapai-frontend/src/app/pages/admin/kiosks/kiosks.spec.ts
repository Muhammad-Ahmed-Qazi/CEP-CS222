import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Kiosks } from './kiosks';

describe('Kiosks', () => {
  let component: Kiosks;
  let fixture: ComponentFixture<Kiosks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Kiosks],
    }).compileComponents();

    fixture = TestBed.createComponent(Kiosks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

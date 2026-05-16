import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bins } from './bins';

describe('Bins', () => {
  let component: Bins;
  let fixture: ComponentFixture<Bins>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Bins],
    }).compileComponents();

    fixture = TestBed.createComponent(Bins);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

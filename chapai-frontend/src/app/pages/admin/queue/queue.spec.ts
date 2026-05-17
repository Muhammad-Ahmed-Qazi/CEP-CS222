import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Queue } from './queue';

describe('Queue', () => {
  let component: Queue;
  let fixture: ComponentFixture<Queue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Queue],
    }).compileComponents();

    fixture = TestBed.createComponent(Queue);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

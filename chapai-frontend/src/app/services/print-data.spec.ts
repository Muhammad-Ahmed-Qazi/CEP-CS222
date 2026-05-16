import { TestBed } from '@angular/core/testing';

import { PrintData } from './print-data';

describe('PrintData', () => {
  let service: PrintData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrintData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

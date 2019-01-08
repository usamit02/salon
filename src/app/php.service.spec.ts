import { TestBed } from '@angular/core/testing';

import { PhpService } from './php.service';

describe('PhpService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PhpService = TestBed.get(PhpService);
    expect(service).toBeTruthy();
  });
});

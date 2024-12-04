import { TestBed } from '@angular/core/testing';

import { BitCoinService } from './bit-coin.service';

describe('BitCoinService', () => {
  let service: BitCoinService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BitCoinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

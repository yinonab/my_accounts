import { TestBed } from '@angular/core/testing';

import { FacebookSdkService } from './facebook-sdk.service';

describe('FacebookSdkService', () => {
  let service: FacebookSdkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacebookSdkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

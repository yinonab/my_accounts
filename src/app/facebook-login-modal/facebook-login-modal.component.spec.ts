import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacebookLoginModalComponent } from './facebook-login-modal.component';

describe('FacebookLoginModalComponent', () => {
  let component: FacebookLoginModalComponent;
  let fixture: ComponentFixture<FacebookLoginModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacebookLoginModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacebookLoginModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

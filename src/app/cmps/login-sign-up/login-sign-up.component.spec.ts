import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginSignupComponent } from './login-sign-up.component';

describe('LoginSignUpComponent', () => {
  let component: LoginSignupComponent;
  let fixture: ComponentFixture<LoginSignupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginSignupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoginSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

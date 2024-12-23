import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginSignUpComponent } from './login-sign-up.component';

describe('LoginSignUpComponent', () => {
  let component: LoginSignUpComponent;
  let fixture: ComponentFixture<LoginSignUpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginSignUpComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoginSignUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

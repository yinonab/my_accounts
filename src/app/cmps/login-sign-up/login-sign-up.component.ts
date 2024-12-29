import { Component, OnInit } from '@angular/core';
import { User } from '../../models/user.model.ts';
import { UserService } from '../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MsgService } from '../../services/msg.service.js';

@Component({
  selector: 'login-sign-up',
  templateUrl: './login-sign-up.component.html',
  styleUrls: ['./login-sign-up.component.scss']
})
export class LoginSignupComponent implements OnInit {
  user: User; // For login/signup form
  isSignupMode: boolean = false; // Toggles between login and signup
  errorMessage: string = ''; // For displaying error messages

  constructor(private userService: UserService, private router: Router, private msgService: MsgService, private route: ActivatedRoute
  ) {
    this.user = this.userService.getEmptyUser(); // Use getEmptyUser for initialization
  }

  ngOnInit(): void {
    // Listen for route changes to toggle mode dynamically
    this.route.url.subscribe((url) => {
      this.isSignupMode = url[0]?.path === 'signup';
    });
  }

  handleInputChange(field: keyof User, value: string | Date): void {
    this.user = { ...this.user, [field]: value };
  }

  toggleMode(): void {
    this.isSignupMode = !this.isSignupMode; // Toggle mode
    this.errorMessage = ''; // Clear any error message
  
    // Navigate to the appropriate route
    const targetRoute = this.isSignupMode ? '/signup' : '/login';
    this.router.navigate([targetRoute]).then(() => {
      // Optionally, manually update Angular's change detection
      this.isSignupMode = targetRoute === '/signup';
    });
  }
  

  onSubmit(): void {
    this.errorMessage = '';
    
    if (this.isSignupMode) {
      this.userService.saveUser(this.user).subscribe({
        next: () => {
          this.userService.login(this.user.username, this.user.password).subscribe({
            next: () => {
              this.msgService.setSuccessMsg(`Signup successful! ${this.user.username} is now logged in.`);
              this.router.navigate(['/contact']);
            },
            error: () => {
              this.errorMessage = 'Signup successful, but login failed. Please log in manually.';
            },
          });
        },
        error: () => {
          this.errorMessage = 'Signup failed. Please try again.';
        },
      });
    } else {
      this.userService.login(this.user.username, this.user.password).subscribe({
        next: (user) => {
          this.msgService.setSuccessMsg(`Login successful!!! ${user.username} is now logged in.`);
          this.router.navigate(['/contact']);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Invalid username or password.';
          this.msgService.setErrorMsg(this.errorMessage);
        },
      });
    }
  }
}
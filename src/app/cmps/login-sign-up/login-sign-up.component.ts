import { Component, OnInit } from '@angular/core';
import { User } from '../../models/user.model.ts';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'login-sign-up',
  templateUrl: './login-sign-up.component.html',
  styleUrls: ['./login-sign-up.component.scss']
})
export class LoginSignupComponent implements OnInit {
  user: User; // For login/signup form
  isSignupMode: boolean = false; // Toggles between login and signup
  errorMessage: string = ''; // For displaying error messages

  constructor(private userService: UserService, private router: Router) {
    this.user = this.userService.getEmptyUser(); // Use getEmptyUser for initialization
  }

  ngOnInit(): void {
    console.log('Initialized user:', this.user);
  }

  handleInputChange(field: keyof User, value: string | Date): void {
    this.user = { ...this.user, [field]: value };
  }

  toggleMode(): void {
    this.isSignupMode = !this.isSignupMode; // Toggle mode
    this.errorMessage = ''; // Clear error message on mode toggle
  
    // Navigate to the appropriate route
    if (this.isSignupMode) {
      this.router.navigate(['/signup']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (!this.user.username || !this.user.password || (this.isSignupMode && !this.user.email)) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    if (this.isSignupMode) {
      this.userService.saveUser(this.user).subscribe({
        next: (newUser) => {
          this.userService.login(this.user.username, this.user.password).subscribe({
            next: (loggedInUser) => {
              if (loggedInUser) {
                console.log('Auto-login successful:', loggedInUser);
                this.router.navigate(['/contact']);
              } else {
                this.errorMessage = 'Auto-login failed. Please log in manually.';
              }
            },
            error: (err) => {
              this.errorMessage = 'Signup successful, but login failed. Please log in manually.';
            }
          });
        },
        error: (err) => {
          this.errorMessage = 'Signup failed. Please try again.';
        }
      });
    } else {
      this.userService.login(this.user.username, this.user.password).subscribe({
        next: (loggedInUser) => {
          if (loggedInUser) {
            console.log('Login successful:', loggedInUser);
            
          } else {
            this.errorMessage = 'Invalid username or password.';
          }
        },
        error: (err) => {
          this.errorMessage = 'Login failed. Please try again.';
        }
      });
    }
  }
}

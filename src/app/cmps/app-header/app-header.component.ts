import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model.ts';
import { MsgService } from '../../services/msg.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss']
})
export class HeaderComponent implements OnInit {
  loggedInUser: User | null = null;
  toggleUpload: boolean = false;

  constructor(private userService: UserService, private router: Router, private msgService: MsgService,) { }

  ngOnInit(): void {
    // Subscribe to logged-in user state
    this.userService.loggedInUser$.subscribe(user => {
      this.loggedInUser = user;
    });
  }

  getUserInitial(): string {
    if (this.loggedInUser?.username) {
      return this.loggedInUser.username[0] || ''; // החזרת האות הראשונה אם קיימת
    }
    return ''; // אם אין שם משתמש, מחזיר מחרוזת ריקה
  }

  onLogout(): void {
    console.log('Setting success message');
    this.msgService.setSuccessMsg('Logout successful!!! You have been logged out.');
    setTimeout(() => {
      this.userService.logout();
      this.router.navigate(['/login']);
    }, 600);
  }

  onImageUploaded(imageUrl: string): void {
    if (!this.loggedInUser) return;

    // עדכון תמונת המשתמש
    const updatedUser: User = { ...this.loggedInUser, img: imageUrl };

    this.userService.saveUser(updatedUser).subscribe({
      next: (savedUser) => {
        console.log('User image updated successfully:', savedUser);

        // עדכון ה-loggedInUser עם הערך החדש
        this.loggedInUser = savedUser;
        this.userService.setLoggedInUser(savedUser, this.userService.getCookie("loginToken") || ''); // עדכון ב-BehaviorSubject

        this.msgService.setSuccessMsg('Profile picture updated successfully!');
        this.toggleUpload = false; // סגירת המנגנון של העלאת התמונה
      },
      error: (err) => {
        console.error('Failed to update user image:', err);
        this.msgService.setErrorMsg('Failed to update profile picture.');
      },
    });
  }
}


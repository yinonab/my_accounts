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

  constructor(private userService: UserService, private router: Router,private msgService: MsgService,) {}

  ngOnInit(): void {
    // Subscribe to logged-in user state
    this.userService.loggedInUser$.subscribe(user => {
      this.loggedInUser = user;
    });
  }

  onLogout(): void {
    console.log('Setting success message');
    this.msgService.setSuccessMsg('Logout successful! You have been logged out.');
    setTimeout(() => {
      this.userService.logout();
      this.router.navigate(['/login']);
    }, 600);
  }
  
}

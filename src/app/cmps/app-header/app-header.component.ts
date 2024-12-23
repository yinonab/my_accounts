import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model.ts';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss']
})
export class HeaderComponent implements OnInit {
  loggedInUser: User | null = null;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    // Subscribe to logged-in user state
    this.userService.loggedInUser$.subscribe(user => {
      this.loggedInUser = user;
    });
  }

  onLogout(): void {
    this.userService.logout();
    this.router.navigate(['/login']); // Redirect to login after logout
  }
}

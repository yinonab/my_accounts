import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subscription, map, of, switchMap, tap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../../models/user.model.ts';
import { UserService } from '../../../services/user.service.js';


@Component({
  selector: 'user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  subscription!: Subscription;
  userService = inject(UserService);

  user$!: Observable<User | null>;


  ngOnInit(): void {
    this.user$ = this.route.data.pipe(map(data => data['user']));
  }


  /**
   * חזרה למסך המשתמשים
   */
  onBack(): void {
    this.router.navigate([{ outlets: { modal: null } }]); // Clear the 'modal' outlet
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
  isLongField(value: string | null | undefined, maxLength: number): boolean {
    return value ? value.length > maxLength : false;
  }
}

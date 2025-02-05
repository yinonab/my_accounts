import { Component, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { User } from '../../../models/user.model.ts';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'user-index',
  templateUrl: './user-index.component.html',
  styleUrls: ['./user-index.component.scss']
})
export class UserIndexComponent {
  userService = inject(UserService);
  users$!: Observable<User[]>;
  destroyRef = inject(DestroyRef);
  isChatOpen = false;

  ngOnInit(): void {
    this.loadUsers(); // טעינת המשתמשים הראשונית
  }

  /**
   * טוען את כל המשתמשים מהשרת
   */
  private loadUsers(): void {
    this.userService.loadUsers().subscribe({
      error: err => console.error('Failed to load users:', err),
    });

    // מאזין לרשימת המשתמשים
    this.users$ = this.userService.users$.pipe(
      takeUntilDestroyed(this.destroyRef)
    );
  }
  openChat() {
    this.isChatOpen = true;
  }

  closeChat() {
    this.isChatOpen = false;
  }

  /**
   * מחיקת משתמש
   */
  onRemoveUser(userId: string): void {
    this.userService.deleteUser(userId).subscribe({
      next: () => this.loadUsers(), // טוען מחדש לאחר מחיקה
      error: err => console.error('Failed to delete user:', err),
    });
  }
}

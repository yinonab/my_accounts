import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/user.model.ts';

@Component({
  selector: 'user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  users$!: Observable<User[]>; // Observable שמכיל את המשתמשים
  filterBy = ''; // משתנה לחיפוש
  @Input() users: User[] = []; // ברירת מחדל כדי למנוע null

  @Output() remove = new EventEmitter<string>(); // הוספת Output להעברת ה-ID



  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.users$ = this.userService.users$;
    this.userService.loadUsers().subscribe();
  }

  onRemoveUser(userId: string): void {
    this.userService.deleteUser(userId).subscribe({
      next: () => this.userService.loadUsers().subscribe(), // רענון רשימה אחרי מחיקה
      error: err => console.error('Failed to delete user:', err),
    });
  }

  onSetFilter(): void {
    this.userService.setFilterBy(this.filterBy);
  }
}

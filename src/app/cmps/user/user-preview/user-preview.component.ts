import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../models/user.model.ts';
import { Router } from '@angular/router';

@Component({
  selector: 'user-preview',
  templateUrl: './user-preview.component.html',
  styleUrls: ['./user-preview.component.scss']
})
export class UserPreviewComponent {
  @Input() user!: User; // מקבל משתמש להצגה
  @Output() remove = new EventEmitter<string>(); // אירוע מחיקה

  constructor(private router: Router) { }

  /**
   * מעבר לפרטי המשתמש
   */
  onPreviewClick(): void {
    console.log('Navigating to:', { modal: ['user', this.user._id] });
    this.router.navigate([{ outlets: { modal: ['user', this.user._id] } }]);
  }


  /**
   * מחיקת משתמש
   */
  onDeleteClick(event: Event, userId: string): void {
    event.stopPropagation(); // מונע את הניווט לפרטים
    this.remove.emit(userId);
  }
  isLongField(value: string | null | undefined, maxLength: number): boolean {
    return value ? value.length > maxLength : false;
  }


}

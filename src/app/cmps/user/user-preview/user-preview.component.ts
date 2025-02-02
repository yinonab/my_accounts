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
  openFacebookProfile(event: Event, user: User): void {
    event.stopPropagation();
    if (!user.username) {
      console.error('Username is missing, cannot search on Facebook');
      return;
    }

    const facebookSearchUrl = `https://www.facebook.com/search/top?q=${encodeURIComponent(user.username)}`;
    window.open(facebookSearchUrl, '_blank');
  }
  openInstagramProfile(event: Event, user: User): void {
    event.stopPropagation();
    if (!user.username) {
      console.error('Username is missing, cannot search on Instagram');
      return;
    }

    // הסרת רווחים מהשם
    const sanitizedUsername = user.username.replace(/\s+/g, '');

    // בדיקה אם השם מכיל אותיות לא באנגלית (עברית, ערבית, וכו')
    const isNonEnglish = /[^a-zA-Z0-9._]/.test(sanitizedUsername);

    let targetUrl;
    if (isNonEnglish) {
      // חיפוש בגוגל אם השם לא באנגלית
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(user.username + " site:instagram.com")}`;
    } else {
      // פתיחת פרופיל ישירות אם השם באנגלית
      targetUrl = `https://www.instagram.com/${encodeURIComponent(sanitizedUsername)}`;
    }

    console.log('Opening URL:', targetUrl);
    window.open(targetUrl, '_blank');
  }



  // openFacebookProfile(event: Event, user: User): void {
  //   event.stopPropagation(); // מונע מעבר אירוע ללחיצה על הקומפוננטה כולה

  //   if (!user.username) {
  //     console.error('Username is missing, cannot search on Facebook');
  //     return;
  //   }

  //   const encodedUsername = encodeURIComponent(user.username);

  //   // קישור לפתיחת חיפוש באפליקציה של פייסבוק
  //   const fbAppUrl = `fb://facewebmodal/f?href=https://www.facebook.com/search/top?q=${encodedUsername}`;

  //   // קישור לפתיחת חיפוש בדפדפן אם האפליקציה לא זמינה
  //   const fbWebUrl = `https://www.facebook.com/search/top?q=${encodedUsername}`;

  //   // ניסיון לפתוח את החיפוש באפליקציה
  //   window.location.href = fbAppUrl;

  //   // אם זה לא עובד, נפתח את הדפדפן לאחר שנייה
  //   setTimeout(() => {
  //     window.open(fbWebUrl, '_blank');
  //   }, 1500);
  // }


}

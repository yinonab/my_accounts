import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { User } from '../../../models/user.model.ts';
import { NavigationStart, Router } from '@angular/router';
import { SocketService } from '../../../services/socket.service.js';
import { BehaviorSubject, concatMap, Observable, of, skip, switchMap, take } from 'rxjs';
import { UserIndexComponent } from '../user-index/user-index.component.js';
import { UserService } from '../../../services/user.service.js';
import { ContactService } from '../../../services/contact.service.js';
import { Contact } from '../../../models/contact.model.js';

@Component({
  selector: 'user-preview',
  templateUrl: './user-preview.component.html',
  styleUrls: ['./user-preview.component.scss']
})
export class UserPreviewComponent {
  @Input() user!: User; // מקבל משתמש להצגה
  @Output() remove = new EventEmitter<string>(); // אירוע מחיקה
  isPrivateChatOpen = false; // האם הצ'אט פתוח
  unreadMessagesCount = 0; // ✅ מספר ההודעות שלא נקראו
  unreadMessagesCount$!: Observable<number>;
  userId: string = inject(UserService).getLoggedInUser()!._id;
  contacts: Contact[] = [];
  private allContacts: Contact[] = [];
  showContactsDropdown = false;
  private static openDropdownIdSubject = new BehaviorSubject<string | null>(null);
  static openDropdownId$ = UserPreviewComponent.openDropdownIdSubject.asObservable();

  constructor(private router: Router, private socketService: SocketService, private userIndex: UserIndexComponent, private contactService: ContactService) { }
  ngOnInit(): void {
    console.log('🚀 UserPreviewComponent initialized');
    UserPreviewComponent.openDropdownId$.subscribe(openDropdownId => {
      this.showContactsDropdown = openDropdownId === this.user._id;
    });
    // האזנה לאירועי שינוי ראוטר – סגירת הדרופדאון בניווט לעמוד אחר
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('🔴 Navigation detected, closing dropdown...');
        UserPreviewComponent.openDropdownIdSubject.next(null);
      }
    });

    // האזנה לאירועי שינוי נראות (מעבר טאב) – סגירת הדרופדאון אם המשתמש יוצא מהטאב
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.unreadMessagesCount$ = this.userIndex.getUnreadMessagesCount(this.user._id);
    // ✅ מאזין להודעות פרטיות
    this.socketService.onPrivateMessage((msg: any) => {
      if (msg.toUserId === this.user._id) {
        console.log(`📩 New private message received for ${this.user.username}:`, msg);

        // ✅ אם הצ'אט לא פתוח, נוסיף למונה ההודעות שלא נקראו
        if (!this.isPrivateChatOpen) {
          this.unreadMessagesCount++;
        }
      }
    });
  }
  /**
   * מעבר לפרטי המשתמש
   */
  onPreviewClick(): void {
    console.log('Navigating to:', { modal: ['user', this.user._id] });
    this.router.navigate([{ outlets: { modal: ['user', this.user._id] } }]);
  }
  openPrivateChat(event: Event): void {
    event.stopPropagation();
    console.log(`🟢 Opening private chat with user: ${this.user._id}`);
    this.isPrivateChatOpen = true;
    this.userIndex.resetUnreadMessages(this.user._id);
  }
  filterContactsByOwner(ownerId: string): void {
    this.contacts = this.allContacts.filter(contact => {
      const owner = contact.owner as string | { _id: string };
      return (typeof owner === 'string' ? owner : owner?._id) === ownerId;
    });

    console.log('🔍 Contacts filtered for owner:', ownerId);
    console.log('📋 Filtered Contacts:', this.contacts);
  }
  ngOnDestroy(): void {
    // ניקוי האזנה כדי למנוע זליגת זיכרון
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
  getFieldValue(contact: Contact, fieldLabel: string): string {
    if (!contact.fields || contact.fields.length === 0) return 'N/A';
    const field = contact.fields.find(f => f.label.toLowerCase() === fieldLabel.toLowerCase());
    return field ? field.value : 'N/A';
  }

  handleVisibilityChange = (): void => {
    if (document.hidden) {
      console.log('🔴 Tab switched or minimized, closing dropdown...');
      UserPreviewComponent.openDropdownIdSubject.next(null);
    }
  };

  toggleContactsDropdown(): void {
    console.log('🟢 toggleContactsDropdown called for user:', this.user._id);

    if (this.showContactsDropdown) {
      console.log('🔴 Closing contacts dropdown for user:', this.user._id);
      UserPreviewComponent.openDropdownIdSubject.next(null); // סוגר את כל הדרופדאונים
      return;
    }

    console.log('🔄 Closing any other open dropdown...');
    UserPreviewComponent.openDropdownIdSubject.next(this.user._id); // פותח את הדרופדאון הנוכחי

    // קריאה לשרת אם אין נתונים
    this.contactService.allContacts$.pipe(
      take(1),
      switchMap(contacts => {
        if (contacts && contacts.length > 0) {
          console.log('📥 Contacts already available:', contacts);
          return of(contacts);
        }

        console.log('📥 No contacts found, fetching from server...');
        this.contactService.loadAllContactsFromDB();
        return this.contactService.allContacts$.pipe(skip(1), take(1));
      })
    ).subscribe(contacts => {
      if (!contacts || contacts.length === 0) {
        console.warn('⚠️ No contacts found after fetching.');
        return;
      }
      this.setContactsAndShowDropdown(contacts);
    });
  }

  private setContactsAndShowDropdown(contacts: Contact[]): void {
    this.allContacts = contacts;
    this.filterContactsByOwner(this.user._id);
    this.showContactsDropdown = true;
    console.log('✅ Contacts dropdown is now open with:', this.contacts);
  }





  closeContactsDropdown(): void {
    console.log('🔴 Closing contacts dropdown');
    this.showContactsDropdown = false;
  }





  resetContacts(): void {
    this.contacts = [...this.allContacts]; // מחזיר את הרשימה המקורית
  }
  navigateToContact(contactId: string): void {
    console.log(`🔗 Navigating to contact: ${contactId}`);
    this.router.navigate([{ outlets: { modal: ['contact', contactId] } }]);
    this.showContactsDropdown = false; // סגירת הדרופדאון לאחר ניווט
  }

  /**
   * סגירת הצ'אט הפרטי
   */
  closePrivateChat(): void {
    this.isPrivateChatOpen = false;
    this.userIndex.resetUnreadMessages(this.user._id); // מאפס את הקאונטר בסגירת הצ'אט
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

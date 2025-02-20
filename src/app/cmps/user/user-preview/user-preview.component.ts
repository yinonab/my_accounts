import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { User } from '../../../models/user.model.ts';
import { Router } from '@angular/router';
import { SocketService } from '../../../services/socket.service.js';
import { Observable, take } from 'rxjs';
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

  constructor(private router: Router, private socketService: SocketService, private userIndex: UserIndexComponent, private contactService: ContactService) { }
  ngOnInit(): void {
    console.log('🚀 UserPreviewComponent initialized');

    this.contactService.contacts$.pipe(take(1)).subscribe(contacts => {
      console.log('📥 Initial LoadContacts result:', contacts);
      this.allContacts = contacts;
      this.contacts = [...contacts];
    });
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

  toggleContactsDropdown(): void {
    console.log('🟢 toggleContactsDropdown called');

    if (this.showContactsDropdown) {
      this.showContactsDropdown = false;
      return;
    }

    if (this.allContacts.length === 0) {
      console.log('📡 Loading contacts from service...');
      this.contactService.loadContacts().pipe(take(1)).subscribe(contacts => {
        console.log('📥 Contacts loaded:', contacts);
        this.allContacts = contacts;
        this.contacts = [...contacts];
        this.showContactsDropdown = true;
        this.filterContactsByOwner(this.user._id);
      });
    } else {
      console.log('📡 Using cached contacts');
      this.showContactsDropdown = true;
      this.filterContactsByOwner(this.user._id);
    }
  }





  resetContacts(): void {
    this.contacts = [...this.allContacts]; // מחזיר את הרשימה המקורית
  }
  navigateToContact(contactId: string): void {
    console.log(`🔗 Navigating to contact: ${contactId}`);
    this.router.navigate([{ outlets: { modal: ['contact', contactId] } }]);
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

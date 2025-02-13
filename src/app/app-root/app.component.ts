import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { ContactService } from '../services/contact.service';
import { FirebaseService } from '../services/firebase.service';
import { PwaService } from '../services/pwa.service';
import { NotificationService } from '../services/notification.service';
import { NotificationMobileService } from '../services/notification.mobile.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'MyAccounts';
  private contactService = inject(ContactService)
  private firebaseService = inject(FirebaseService);
  private pwaService = inject(PwaService);
  private notificationMobileService = inject(NotificationMobileService);
  subscription!: Subscription
  // showInstallButton = this.pwaService.showInstallButton;

  // 🟢 הפונקציה מחזירה את הערך בכל שינוי
  get showInstallButton(): boolean {
    return this.pwaService.showInstallButton;
  }




  ngOnInit(): void {
    this.subscription = this.contactService.loadContacts()
      .pipe(take(1))
      .subscribe({
        error: err => console.log('err:', err)
      })
    console.log("🚀 AppComponent Initialized");

    if (!this.pwaService.isRunningStandalone() && this.pwaService.isIOS()) {
      alert("📌 כדי לקבל התראות ב-iOS, התקן את האפליקציה למסך הבית.");
    }

    if (Notification.permission === 'default') {
      setTimeout(() => {
        const lastNotificationTime = this.firebaseService.getLastNotificationTime() ?? 0; // אם null, נגדיר כ-0

        // בדיקה אם כבר קפצה התראה מ-FirebaseService
        if (Date.now() - lastNotificationTime < 8000) {
          console.log("🔕 לא מציגים התראה כי FirebaseService כבר הציג אחת לאחרונה");
          return;
        }

        // אם ההתראות כבר אושרו – אין צורך להציג את הבקשה
        if (Notification.permission === 'granted') {
          console.log("✅ ההתראות כבר אושרו, לא צריך לבקש שוב");
          return;
        }

        // אם אין התראה מהשירות האחר וההרשאה עדיין לא אושרה – מציגים את הבקשה
        if (Notification.permission === 'default' || Notification.permission === 'denied') {
          this.notificationMobileService.showNotificationPrompt();
        }
      }, 8000);


    }

    this.firebaseService.getFCMToken().then(token => {
      if (token) {
        console.log("🔑 FCM Token received (on init):", token);
      }
    });

    // הפעלת שירות Firebase
    this.firebaseService.getTokenObservable().subscribe(token => {
      if (token) {
        console.log("🔑 FCM Token received:", token);
        // כאן תוכל לשלוח את ה-token לשרת אם צריך
      }
    });
  }

  installPWA() {
    this.pwaService.installPWA();
  }



  ngOnDestroy(): void {
    this.subscription?.unsubscribe?.()
  }
}

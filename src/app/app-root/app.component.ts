import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { ContactService } from '../services/contact.service';
import { FirebaseService } from '../services/firebase.service';
import { PwaService } from '../services/pwa.service';
import { NotificationService } from '../services/notification.service';
import { NotificationMobileService } from '../services/notification.mobile.service';
import { UserService } from '../services/user.service';

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
  private userService = inject(UserService);
  subscription!: Subscription
  private idleTimer: any;
  private idleTime = 0;
  private idleMaxTime = 600; // 10 דקות

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
    this.userService.refreshLoginTokenIfNeeded();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("🔄 הדף ברקע - מפעיל טיימר לרענון...");
        setTimeout(() => {
          console.log("🔄 רענון בגלל זמן ממושך ברקע...");
          location.reload();
        }, 60 * 1000); // רענון כל 2 דקות
      } else {
        console.log("🔄 האפליקציה חזרה לפוקוס – בודק תוקף Token...");
        this.userService.refreshLoginTokenIfNeeded();
      }
    });
    this.resetIdleTimer();

    window.addEventListener('mousemove', () => this.resetIdleTimer());
    window.addEventListener('keydown', () => this.resetIdleTimer());

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "RESTORE_LOGIN_TOKEN") {
        console.log("🔄 קיבלנו Token משוחזר מה-Service Worker:", event.data.token);
        this.userService.restoreLoginToken(event.data.token);
      }
    });
    setInterval(() => {
      console.log("🔄 שולח Keep-Alive ping לשרת...");
      this.userService.keepSessionAlive();
    }, 5 * 60 * 1000);


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

  private resetIdleTimer(): void {
    clearTimeout(this.idleTimer);
    this.idleTime = 0;
    this.idleTimer = setInterval(() => {
      this.idleTime++;
      if (this.idleTime >= this.idleMaxTime) {
        console.log("🔄 משתמש לא פעיל זמן רב – מבצע ריענון Token...");
        this.userService.refreshLoginTokenIfNeeded();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe?.()
  }
}

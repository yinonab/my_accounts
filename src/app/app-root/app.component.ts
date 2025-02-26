import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { ContactService } from '../services/contact.service';
import { FirebaseService } from '../services/firebase.service';
import { PwaService } from '../services/pwa.service';
import { NotificationService } from '../services/notification.service';
import { NotificationMobileService } from '../services/notification.mobile.service';
import { UserService } from '../services/user.service';
import { SocketService } from '../services/socket.service';

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
  private notificationService = inject(NotificationService);

  private userService = inject(UserService);
  private socketService = inject(SocketService);
  subscription!: Subscription
  private idleTimer: any;
  private idleTime = 0;
  private idleMaxTime = 600; // 10 דקות
  private wakeLock: any;
  showBatteryOptimizationButton = true;

  // showInstallButton = this.pwaService.showInstallButton;

  // 🟢 הפונקציה מחזירה את הערך בכל שינוי
  get showInstallButton(): boolean {
    return this.pwaService.showInstallButton;
  }




  async ngOnInit(): Promise<void> {
    this.notificationService.startKeepAliveNotifications();
    await this.requestWakeLock(); // ✅ קריאה ל-Wake Lock אחרי ההגדרה הנכונה
    if (localStorage.getItem('batteryOptimizationDisabled')) {
      this.showBatteryOptimizationButton = false;
    }

    this.subscription = this.contactService.loadContacts()
      .pipe(take(1))
      .subscribe({
        error: err => console.log('err:', err)
      })
    console.log("🚀 AppComponent Initialized");

    this.userService.refreshLoginTokenIfNeeded();

    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) {
        console.log("🔄 האפליקציה עברה לרקע, שולח פינג כדי לוודא שה-Socket לא יתנתק...");
        this.socketService.emit("ping");
        // console.log("🔄 הדף ברקע - מפעיל טיימר לרענון...");
        // setTimeout(() => {
        //   console.log("🔄 רענון בגלל זמן ממושך ברקע...");
        //   location.reload();
        // },10 * 60 * 1000); // רענון כל 2 דקות
      } else {
        console.log("🔄 האפליקציה חזרה לפוקוס – בודק תוקף Token...");
        this.userService.refreshLoginTokenIfNeeded();
        console.log("📲 האפליקציה חזרה לפוקוס, בודק אם ה-Socket עדיין מחובר...");
        if (!this.socketService.isConnected()) {
          console.log("🔌 ה-Socket נותק, מבצע התחברות מחדש...");
          this.socketService.setup();
        }
        console.log("🔄 בודק אם ה-FCM Token מעודכן...");
        const newToken = await this.firebaseService.getFCMToken();
        if (newToken) {
          console.log("✅ טוקן מעודכן:", newToken);
        } else {
          console.warn("⚠️ לא נמצא טוקן, מבצע בקשת הרשאה מחדש...");
          this.firebaseService.requestNotificationPermission();
        }

      }
    });
    this.resetIdleTimer();

    window.addEventListener('mousemove', () => this.resetIdleTimer());
    window.addEventListener('keydown', () => this.resetIdleTimer());

    navigator.serviceWorker.ready.then((registration) => {
      const syncReg = registration as any; // עקיפת בדיקת טיפוס
      if (syncReg.sync && syncReg.sync.register) {
        setInterval(() => {
          syncReg.sync.register('keep-alive')
            .then(() => console.log("🔄 Registered Keep-Alive Sync"))
            .catch((err: any) => console.warn("⚠️ Failed to register sync:", err));
        }, 2 * 60 * 1000);
      } else {
        console.warn("⚠️ Background Sync לא נתמך בדפדפן הזה.");
      }
    });


    navigator.serviceWorker.addEventListener("message", async (event) => {
      if (event.data?.type === "RESTORE_LOGIN_TOKEN") {
        console.log("🔄 קיבלנו Token משוחזר מה-Service Worker:", event.data.token);
        this.userService.restoreLoginToken(event.data.token);
      }

      if (event.data?.type === "WAKE_UP") {
        console.log("📲 קיבלנו הודעה להעיר את האפליקציה - מבצע התחברות מחדש!");

        if (document.hidden) {
          console.log("🔄 האפליקציה ברקע, מנסה להעיר אותה...");
          window.focus();
        }

        // ✅ בודק אם ה-Socket מחובר
        if (!this.socketService.isConnected()) {
          console.log("🔌 ה-Socket נותק, מתחבר מחדש...");
          this.socketService.setup();
        }

        // ✅ ריענון ה-Token (למנוע התנתקות אם PWA היה ברקע זמן רב)
        console.log("🔄 ריענון Token למניעת התנתקות...");
        await this.userService.refreshLoginTokenIfNeeded();

        // ✅ שולח Keep-Alive מיד לאחר שהתעורר
        console.log("🔄 שולח Keep-Alive מיידי לאחר ההתעוררות...");
        this.userService.keepSessionAlive();
      }
    });

    // ✅ שינוי ה-Keep-Alive כך שישלח גם בקשות רענון טוקן
    setInterval(async () => {
      console.log("🔄 שולח Keep-Alive ping לשרת...");
      await this.userService.refreshLoginTokenIfNeeded();
      this.userService.keepSessionAlive();
    }, 3 * 60 * 1000); // כל 3 דקות



    if (!this.pwaService.isRunningStandalone() && this.pwaService.isIOS()) {
      alert("📌 כדי לקבל התראות ב-iOS, התקן את האפליקציה למסך הבית.");
    }

    if (Notification.permission === 'default') {
      setTimeout(() => {
        const lastNotificationTime = this.firebaseService.getLastNotificationTime() ?? 0; // אם null, נגדיר כ-0

        // בדיקה אם כבר קפצה התראה מ-FirebaseService
        if (Date.now() - lastNotificationTime < 4000) {
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
  async requestWakeLock() {
    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeLock.addEventListener("release", () => {
        console.log("🔋 Wake Lock שוחרר! מבקש שוב...");
        this.requestWakeLock();
      });
      console.log("✅ Wake Lock פעיל, המסך לא יכבה");
    } catch (err) {
      console.error("❌ לא ניתן להפעיל Wake Lock:", err);
    }
  }

  disableBatteryOptimization() {
    if ('requestWakeLock' in navigator) {
      (navigator as any).requestWakeLock("screen").then(() => {
        console.log("✅ חיסכון בסוללה בוטל");

        // ✅ שומר ב-localStorage שהמשתמש הפעיל את הביטול
        localStorage.setItem('batteryOptimizationDisabled', 'true');

        // ✅ מסתיר את הכפתור מה-UI
        this.showBatteryOptimizationButton = false;

      }).catch((err: any) => {
        console.error("❌ שגיאה בהרשאת Wake Lock:", err);
      });
    } else {
      alert("🔋 לחץ לחיצה ארוכה על האפליקציה -> לחץ על האייקון עם הסימן : ! -> סוללה -> בחר באופציה ללא הגבלה");
      localStorage.setItem('batteryOptimizationDisabled', 'true');
      this.showBatteryOptimizationButton = false;
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe?.()
  }
}

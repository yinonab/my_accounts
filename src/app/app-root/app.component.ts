declare var cordova: any;
declare var device: any;

import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { ContactService } from '../services/contact.service';
import { FirebaseService } from '../services/firebase.service';
import { PwaService } from '../services/pwa.service';
import { NotificationService } from '../services/notification.service';
import { NotificationMobileService } from '../services/notification.mobile.service';
import { UserService } from '../services/user.service';
import { SocketService } from '../services/socket.service';
import { App } from '@capacitor/app'; // 🔸 תוסף חדש
import { Device } from '@capacitor/device'; // 🔸 תוסף חדש
import { FacebookLogin } from '@capacitor-community/facebook-login';
import { FacebookService } from '../services/FacebookService';



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
  private facebookService = inject(FacebookService);

  subscription!: Subscription
  private idleTimer: any;
  private idleTime = 0;
  private idleMaxTime = 600; // 10 דקות

  showBatteryOptimizationButton = true;
  

  // 🟢 הפונקציה מחזירה את הערך בכל שינוי
  get showInstallButton(): boolean {
    return this.pwaService.showInstallButton;
  }




  ngOnInit(): void {
    const batteryOptDisabled = localStorage.getItem('batteryOptimizationDisabled');
    if (batteryOptDisabled === 'true') {
      this.showBatteryOptimizationButton = false;
    }
    this.notificationService.startKeepAliveNotifications();
    this.keepScreenAwake();
    this.subscription = this.contactService.loadContacts()
      .pipe(take(1))
      .subscribe({
        error: err => console.log('err:', err)
      });

    console.log("🚀 AppComponent Initialized");
    this.facebookService.checkFacebookLoginState();

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

    // 🔸🔸🔸 קוד חדש לטיפול במעבר בין מצב רקע וקדמה (עם Capacitor) 🔸🔸🔸
    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        console.log("🔄 (Capacitor) האפליקציה עברה לרקע, שולח פינג לשמירת החיבור...");
        this.socketService.emit("ping");
      } else {
        console.log("🔄 (Capacitor) האפליקציה חזרה לקדמה – בודק חיבורים וטוקנים...");
        this.userService.refreshLoginTokenIfNeeded();
        if (!this.socketService.isConnected()) {
          console.log("🔌 (Capacitor) ה-Socket נותק, מבצע התחברות מחדש...");
          this.socketService.setup();
        }
        const newToken = await this.firebaseService.getFCMToken();
        if (newToken) {
          console.log("✅ (Capacitor) טוקן מעודכן:", newToken);
        } else {
          console.warn("⚠️ (Capacitor) אין טוקן, מבקש הרשאות מחדש...");
          this.firebaseService.requestNotificationPermission();
        }
      }
    });

    // 🔸🔸🔸 קוד חדש לקבלת מידע על המכשיר (עם Capacitor Device) 🔸🔸🔸
    Device.getInfo().then(info => {
      console.log("📱 (Capacitor Device) Device Info:", info);
    });
    this.resetIdleTimer();

    window.addEventListener('mousemove', () => this.resetIdleTimer());
    window.addEventListener('keydown', () => this.resetIdleTimer());

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "RESTORE_LOGIN_TOKEN") {
        console.log("🔄 קיבלנו Token משוחזר מה-Service Worker:", event.data.token);
        this.userService.restoreLoginToken(event.data.token);
      }
      if (event.data && event.data.type === "WAKE_UP") {
        console.log("📲 קיבלנו הודעה להעיר את האפליקציה - מבצע התחברות מחדש!");
        if (document.hidden) {
          console.log("🔄 האפליקציה ברקע, מנסה להעיר אותה...");
          window.focus();
        }

        if (!this.socketService.isConnected()) {
          console.log("🔌 ה-Socket נותק, מתחבר מחדש...");
          this.socketService.setup();
        }
      }
    });
    setInterval(() => {
      console.log("🔄 שולח Keep-Alive ping לשרת...");
      this.userService.keepSessionAlive();
    }, 3 * 60 * 1000);


    if (!this.pwaService.isRunningStandalone() && this.pwaService.isIOS()) {
      alert("📌 כדי לקבל התראות ב-iOS, התקן את האפליקציה למסך הבית.");
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
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
  async keepScreenAwake() {
    if ('wakeLock' in navigator) {
      try {
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('✅ Wake Lock enabled');
        wakeLock.addEventListener('release', () => {
          console.log('⚠️ Wake Lock was released');
        });
      } catch (err) {
        console.error('❌ Wake Lock failed:', err);
      }
    } else {
      console.warn('⚠️ Wake Lock API not supported');
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
      alert("לביצועים גבוהים :\nלחץ לחיצה ארוכה על האייקון של האפליקציה,\nלחץ על האייקון עם הסימן : (!) ,\nלחץ על האופציה חיסכון בסוללה / סוללה,\nבחר באופציה ללא הגבלה.");
      localStorage.setItem('batteryOptimizationDisabled', 'true');
      this.showBatteryOptimizationButton = false;
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe?.()
  }

}

import { inject, Injectable, Injector } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';
import { config } from './config.service';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';


// הגדרות Firebase מהקונסול
const firebaseConfig = {
    apiKey: "AIzaSyD6YVTQRO_GtEp_LAZOIzRODS3jNHu-YgE",
    authDomain: "my-accounts-76d6e.firebaseapp.com",
    projectId: "my-accounts-76d6e",
    storageBucket: "my-accounts-76d6e.firebasestorage.app",
    messagingSenderId: "988437566016",
    appId: "1:988437566016:web:72f59ea673d54185fbc5a5",
    measurementId: "G-X1FLCYTWDM"
};

@Injectable({
    providedIn: 'root'
})
export class FirebaseService {
    private messaging;
    private fcmToken: { [userId: string]: string } = {};
    private nativeToken: string | null = null; // [RED] טוקן native
    private tokenSubject = new BehaviorSubject<string | null>(null);
    readonly vapidKey = "BJ0eDoKaqa38VXNfTokyeUKpM0OA9RflAK0gMkjeA-ddZlCYvE02m5YZa7ESS8dujQL-4S_67puRZJVP5Y_CYuo"; // וודא שזה המפתח הנכון
    private injector = inject(Injector);
    private _notificationService: NotificationService | null = null;
    private _userService: UserService | null = null;
    private lastNotificationTime: number | null = null;
    constructor() {
        console.log("🚀 Firebase Service Initialized");

        // אתחול Firebase
        const app = initializeApp(firebaseConfig);
        this.messaging = getMessaging(app);

        this.registerServiceWorker();
        this.requestNotificationPermission();
        this.listenForMessages();
    }
    private get notificationService(): NotificationService {
        if (!this._notificationService) {
            this._notificationService = this.injector.get(NotificationService);
        }
        return this._notificationService;
    }
    private get userService(): UserService {
        if (!this._userService) {
            this._userService = this.injector.get(UserService);
        }
        return this._userService;
    }

    // רישום ה-Service Worker כדי לקבל נוטיפיקציות גם כשהאפליקציה לא פתוחה
    // private async registerServiceWorker() {
    //     if ('serviceWorker' in navigator) {
    //         try {
    //             const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    //             console.log("✅ Service Worker Registered:", registration);
    //         } catch (error) {
    //             console.error("❌ Service Worker Registration Failed:", error);
    //         }
    //     }
    // }
    private async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            if (navigator.serviceWorker.controller) {
                console.log("🔄 Service Worker כבר רשום. לא מבצע רישום נוסף.");
                return;
            }
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log("✅ Service Worker Registered:", registration);
            } catch (error) {
                console.error("❌ Service Worker Registration Failed:", error);
            }
        }
    }


    // מחזיר Observable שניתן להאזין לו כדי לקבל את ה-token
    getTokenObservable() {
        return this.tokenSubject.asObservable();
    }

    // בקשת הרשאות וקבלת ה-token
    async requestNotificationPermission(): Promise<void> {
      console.log("Platform:", Capacitor.getPlatform());
        if (Capacitor.getPlatform() === 'web' && typeof Notification !== 'undefined') {
          // טיפול בסביבת web
          try {
            const permission = await Notification.requestPermission();
            console.log("🔔 Notification permission (web):", permission);
            if (permission === 'granted') {
              const token = await this.getFCMToken();
              if (!token) {
                console.warn("No valid FCM token received; not sending to server.");
              }
            } else {
              console.warn("❌ Notification permission denied (web).");
            }
          } catch (error) {
            console.error("❌ Error getting web notification permission:", error);
          }
        } else {
          // טיפול בסביבת native באמצעות Capacitor PushNotifications
          try {
            console.log("Requesting native push notifications permission...");
            const permissionResult = await PushNotifications.requestPermissions();
            if (permissionResult.receive === 'granted') {
              await PushNotifications.register();
      
              // מאזינים לאירועי רישום לקבלת הטוקן
              PushNotifications.addListener('registration', (tokenData) => {
                console.log("✅ Native push registration token:", tokenData);
                // שלח את הטוקן לשרת שלך
                this.nativeToken = tokenData.value; // [RED] שמירת הטוקן native
                this.tokenSubject.next(this.nativeToken);
                this.sendTokenToServer(tokenData.value);
              });
      
              PushNotifications.addListener('registrationError', (error) => {
                console.error("❌ Error with native push registration:", error);
              });
            } else {
              console.warn("❌ Native push notification permission not granted.");
            }
          } catch (error) {
            console.error("❌ Error requesting native push notification permission:", error);
          }
        }
      }
      

    // קבלת ה-FCM Token ושליחתו לשרת
    // async getFCMToken(): Promise<string | null> {
    //     try {
    //         const token = await getToken(this.messaging, { vapidKey: this.vapidKey });
    //         console.log("✅ first:", token);
    //         if (token) {
    //             console.log("✅ FCM Token received:", token);
    //             this.tokenSubject.next(token);
    //             //await this.sendTokenToServer(token);
    //             await this.notificationService.saveSubscription({ token });
    //             return token; // ✅ עכשיו הפונקציה מחזירה את ה-Token
    //         } else {
    //             console.warn("⚠️ No FCM token received.");
    //             return null;
    //         }
    //     } catch (error) {
    //         console.error("❌ Error retrieving FCM token:", error);
    //         return null;
    //     }
    // }
    async getFCMToken(): Promise<string | null> {
      console.log("Platform:", Capacitor.getPlatform());
      if (Capacitor.getPlatform() === 'web') {
          const currentUser = this.userService.getLoggedInUser()?._id;
          console.log(` currentUser - ${currentUser}:`);
          if (currentUser && this.fcmToken[currentUser]) {
              console.log(`🔄 Using existing web token for user ${currentUser}:`, this.fcmToken[currentUser]);
              return this.fcmToken[currentUser];
          }
          try {
              const newToken = await getToken(this.messaging, { vapidKey: this.vapidKey });
              console.log(` newToken (web) - ${newToken}:`);
              if (newToken) {
                  console.log(`✅ New FCM Token received for ${currentUser}:`, newToken);
                  this.fcmToken[currentUser!] = newToken;
                  await this.notificationService.saveSubscription({ token: newToken });
                  return newToken;
              } else {
                  console.warn("⚠️ No FCM token received (web).");
                  return null;
              }
          } catch (error) {
              console.error("❌ Error retrieving FCM Token (web):", error);
              return null;
          }
      } else {
          // [RED] בסביבה native נחזיר את הטוקן שהתקבל מהאירוע registration
          console.log("Running on native – using native token:", this.nativeToken);
          return this.nativeToken;
      }
  }

    getLastNotificationTime(): number | null {
        return this.lastNotificationTime;
    }
    // מאזין לנוטיפיקציות כשהאפליקציה **פתוחה**
    listenForMessages() {
        onMessage(this.messaging, (payload) => {
          console.log("📩 Foreground notification received:", payload);
          this.lastNotificationTime = Date.now();
      
          const notificationTitle = payload.data?.['title'] || "🔔 הודעה חדשה";
          const notificationOptions = {
            body: payload.data?.['body'] || "📩 יש לך הודעה חדשה!",
            icon: payload.data?.['icon'] || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
            badge: payload.data?.['badge'] || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
            vibrate: [200, 100, 200],
            requireInteraction: true
          };
      
          // אם המסך מוסתר וה-Notification API קיים, מציגים התראה
          if (document.hidden && typeof Notification !== 'undefined') {
            console.log("📲 מציג נוטיפיקציה", notificationTitle);
            new Notification(notificationTitle, notificationOptions);
          } else {
            console.log("🔔 הצגת התראה בתוך האפליקציה");
          }
      
          if (payload.data?.['wakeUpApp'] === "true") {
            console.log("📲 קיבלנו הודעה להעיר את האפליקציה - מבצע התחברות מחדש!");
            window.focus();
          }
        });
      }
      



    // שליחת ה-Token לשרת לשימוש עתידי
    async sendTokenToServer(token: string) {
        try {
            const response = await fetch(`${config.baseURL}/notification/save-token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ token })
            });

            if (response.ok) {
                console.log("✅ FCM Token saved on server.");
            } else {
                console.warn("⚠️ Failed to save FCM token on server.");
            }
        } catch (error) {
            console.error("❌ Error sending token to server:", error);
        }
    }
}

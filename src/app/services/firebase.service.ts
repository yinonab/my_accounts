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
        this.listenForBackgroundMessages();

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
    // private async registerServiceWorker() {
    //     if ('serviceWorker' in navigator) {
    //         if (navigator.serviceWorker.controller) {
    //             console.log("🔄 Service Worker כבר רשום. לא מבצע רישום נוסף.");
    //             return;
    //         }
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
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log("✅ Service Worker Registered:", registration);
    
                // 🔥 וודא ש-Firebase משתמש ב-Service Worker
                navigator.serviceWorker.ready.then((reg) => {
                    console.log("✅ Service Worker is Ready:", reg);
                });
    
            } catch (error) {
                console.error("❌ Service Worker Registration Failed:", error);
            }
        } else {
            console.warn("⚠️ Service Workers are not supported in this browser.");
        }
    }
    

    // מחזיר Observable שניתן להאזין לו כדי לקבל את ה-token
    getTokenObservable() {
        return this.tokenSubject.asObservable();
    }


    async requestNotificationPermission(): Promise<void> {
      console.log("🚀 Checking notification permissions on:", Capacitor.getPlatform());
  
      if (Capacitor.getPlatform() === 'web' && typeof Notification !== 'undefined') {
          try {
              const permission = await Notification.requestPermission();
              console.log("🔔 Web Notification Permission:", permission);
              if (permission === 'granted') {
                  const token = await this.getFCMToken();
                  if (!token) {
                      console.warn("⚠️ No valid FCM token received; not sending to server.");
                  }
              } else {
                  console.warn("❌ Web Notification permission denied.");
              }
          } catch (error) {
              console.error("❌ Error getting web notification permission:", error);
          }
      } else {
          // 🟢 טיפול בסביבת native באמצעות Capacitor PushNotifications
          try {
              console.log("📲 Checking native push notification permission...");
  
              // 🔴 שלב ראשון: לבדוק אם כבר יש הרשאה
              const permissionStatus = await PushNotifications.checkPermissions();
              console.log("🔄 Current native push permission status:", permissionStatus);
  
              if (permissionStatus.receive !== 'granted') {
                  console.log("📢 Requesting push permission...");
                  const permissionResult = await PushNotifications.requestPermissions();
                  console.log("🔄 Native Push Notification Permission Result:", permissionResult);
  
                  if (permissionResult.receive !== 'granted') {
                      console.warn("❌ Native push notification permission not granted.");
                      return;
                  }
              }
  
              console.log("✅ Notification permission granted!");
  
              // 🔴 רישום לקבלת טוקן
              await PushNotifications.register();
  
              // 🔴 בדיקה אם נרשם טוקן בפועל
              PushNotifications.addListener('registration', async (tokenData) => {
                if (tokenData.value) {
                    console.log("🎉 ✅ Native push registration token received:", tokenData.value);
                    this.nativeToken = tokenData.value;
                    this.tokenSubject.next(this.nativeToken);
                    await this.notificationService.saveSubscription({ token: tokenData.value });
                } else {
                    console.warn("⚠️ Token registration event triggered but token is empty!");
                }
            });
            
  
              PushNotifications.addListener('registrationError', (error) => {
                  console.error("❌ Error during native push registration:", error);
              });
              PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('📲 Received background notification:', notification);
                // כאן תוכל להוסיף את הלוגיקה שלך כדי להציג את הנוטיפיקציה בסטאטוס בר או בצורה אחרת
                // לדוגמה, תוכל להציג את הנוטיפיקציה בסטאטוס בר או בטיפול מותאם אישית:
                if (notification.body) {
                    // הצגת נוטיפיקציה בצורה מותאמת אישית, לדוגמה בהודעה
                    alert(`New notification: ${notification.body}`);
                }
            });
  
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
      console.log("🚀 Retrieving FCM Token on:", Capacitor.getPlatform());
  
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
          console.log("📲 Running on native – checking native token...");
  
          // 🟢 נוודא שהטוקן בנייטיב מתקבל
          if (!this.nativeToken) {
              console.warn("❌ No native token found. Trying to register again...");
              await this.requestNotificationPermission();
  
              // 🔴 נוודא שוב אחרי רישום מחדש
              if (!this.nativeToken) {
                  console.error("🚨 Still no native token after re-registration!");
                  return null;
              }
          }
  
          console.log("✅ Native token found:", this.nativeToken);
          return this.nativeToken;
      }
  }
  
  

    getLastNotificationTime(): number | null {
        return this.lastNotificationTime;
    }

    async listenForBackgroundMessages() {
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log("📲 Received background notification:", notification);
        
            const notificationTitle = notification.title || "🔔 הודעה חדשה";
            
            // לוודא ש-`badge` הוא תמיד מחרוזת
            const notificationBadge = typeof notification.badge === 'number' ? notification.badge.toString() : notification.badge;
        
            const notificationOptions = {
                body: notification.body || "📩 יש לך הודעה חדשה!",
                badge: notificationBadge,  // שדה badge עכשיו הוא תמיד string
                vibrate: [200, 100, 200],
                requireInteraction: true
            };
        
            // אם האפליקציה ברקע - נשלח נוטיפיקציה כסטטוס בר
            if (document.hidden) {
                console.log("📲 Showing notification in background:", notificationTitle);
                new Notification(notificationTitle, notificationOptions);
            } else {
                console.log("🔔 Showing notification inside the app");
            }
        
            if (notification.data?.['wakeUpApp'] === "true") {
                console.log("📲 Wake-up app triggered");
                window.focus();
            }
        });
        
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

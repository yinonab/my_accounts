// src/app/services/notification.service.ts
import { Injectable } from '@angular/core';
import { SwPush, SwUpdate, VersionEvent, VersionReadyEvent } from '@angular/service-worker';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { config } from './config.service';
import { FirebaseService } from './firebase.service';

// הוספת הממשק החדש
export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  wakeUpApp?: boolean;
  vibrate?: number[];
  sound?: string;
  data?: {
    [key: string]: any;
  };
  actions?: {
    action: string;
    title: string;
    icon?: string;
  }[];
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private VAPID_PUBLIC_KEY: string = '';
  private isSubscriptionRequested: boolean = false;


  constructor(
    private swPush: SwPush,
    private http: HttpClient,
    private swUpdate: SwUpdate,
    private firebaseService: FirebaseService
  ) {
    console.log('🚀 NotificationService Initialized', {
      vapidPublicKey: this.VAPID_PUBLIC_KEY ? '✅ Present' : '❌ Missing',
      serviceWorkerEnabled: swPush.isEnabled
    });
    this.loadVapidPublicKey().then(() => {
      console.log('✅ VAPID Key Loaded at startup:', this.VAPID_PUBLIC_KEY);
    });

    // האזנה לעדכוני Service Worker
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event: VersionEvent) => {
        if (event.type === 'VERSION_READY') {
          const versionEvent = event as VersionReadyEvent;
          console.log('🔄 Service Worker Update Available', {
            currentVersion: versionEvent.currentVersion,
            latestVersion: versionEvent.latestVersion
          });
        }
      });
    }
  }
  // async getLatestSubscription(): Promise<PushSubscription | null> {
  //   try {
  //     const response = await firstValueFrom(this.http.get<{ subscription: PushSubscription }>(
  //       `${config.baseURL}/notification/get-subscription`,
  //       { withCredentials: true }
  //     ));
  //     return response.subscription;
  //   } catch (error) {
  //     console.error("❌ Failed to fetch latest subscription from server", error);
  //     return null;
  //   }
  // }
  async getLatestSubscription(): Promise<string | null> {
    try {
      const response = await firstValueFrom(this.http.get<{ token: string }>(
        `${config.baseURL}/notification/get-subscription`,
        { withCredentials: true }
      ));

      if (response?.token) {
        console.log("✅ Subscription retrieved from server:", response.token);
        return response.token; // 🔹 מחזירים רק את ה-Token
      } else {
        console.warn("⚠️ No valid subscription found on server.");
        return null;
      }
    } catch (error) {
      console.error("❌ Error retrieving subscription from server:", error);
      return null;
    }
  }


  async saveSubscription(subscription: { token: string }) {
    console.log('📩 Saving subscription to server:', subscription);

    try {
      await firstValueFrom(this.http.post(
        `${config.baseURL}/notification`, // 🔹 כתובת ה-API נשארת זהה
        { token: subscription.token }, // 🔹 שליחת `token` בלבד
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      ));
      console.log('✅ Subscription saved successfully.');
    } catch (error) {
      console.error('❌ Error saving subscription:', error);
    }
  }


  // עדכון הפונקציה לקבל את הטיפוס החדש
  // async sendNotification(data: PushNotificationData): Promise<void> {
  //   console.log('Attempting to send notification:', {
  //     title: data.title,
  //     body: data.body,
  //     icon: data.icon || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
  //     badge: data.badge || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
  //     data: data.data
  //   });
  //   if (!this.swPush.isEnabled) {
  //     console.warn('Push notifications are not enabled');
  //     return;
  //   }

  //   try {
  //     console.log("⏳ Checking existing subscription...");
  //     let subscription = await this.getLatestSubscription(); // 🔹 נשלוף מהשרת
  //     console.log("✅ Subscription result:", subscription);
  //     console.log("🚀 יקךךם'");
  //     if (!subscription) {
  //       console.warn('❌ No subscription found, requesting new one...');
  //       subscription = await this.requestSubscription(); // ✅ מחזיר את המנוי החדש
  //       if (!subscription) {
  //         console.error('❌ Subscription request failed, cannot send notification.');
  //         return;
  //       }
  //     }

  //     console.log('📡 Sending notification to server', {
  //       endpoint: subscription.endpoint ? '✅ Present' : '❌ Missing'
  //     });

  //     const response = await firstValueFrom(this.http.post(
  //       `${config.baseURL}/notification/send`,
  //       {
  //         payload: {
  //           title: data.title,
  //           body: data.body,

  //           icon: data.icon || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
  //           badge: data.badge || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",

  //           vibrate: data.vibrate || [200, 100, 200],
  //           tag: data.tag || 'message',
  //           requireInteraction: data.requireInteraction ?? true
  //         }
  //       },
  //       {
  //         withCredentials: true,
  //         headers: { 'Content-Type': 'application/json' }
  //       }
  //     ));

  //     console.log('✅ Notification sent successfully', {
  //       timestamp: new Date().toISOString()
  //     });

  //   } catch (error) {
  //     console.error('❌ Error sending notification', {
  //       error,
  //       timestamp: new Date().toISOString()
  //     });
  //     throw error;
  //   }
  // }

  async sendNotification(data: PushNotificationData): Promise<void> {
    console.log('🚀 Preparing to send notification:', {
      title: data.title,
      body: data.body
    });

    try {
      console.log("⏳ Checking existing FCM token...");
      // let token = await this.getLatestSubscription();

      // if (token) {
      //   console.log("✅ Found existing FCM token:", token);
      // } else {
      // console.warn('❌ No FCM token found, requesting a new one...');
      let token = await this.requestSubscription();
      if (token) {
        console.log("✅ Found existing FCM token:", token);
      } else {
        console.error('❌ FCM token request failed, cannot send notification.');
        return;
        // }
      }

      console.log('📡 Sending notification to server');

      // 🔹 שולחים רק את ה-Token לשרת
      const response = await firstValueFrom(
        this.http.post(
          `${config.baseURL}/notification/send`,
          {
            title: data.title,
            body: data.body,
            wakeUpApp: true,
            token: token,
            icon: data.icon || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
            badge: data.badge || "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
            vibrate: data.vibrate || [200, 100, 200],
            tag: data.tag || 'message',
            requireInteraction: data.requireInteraction ?? true
          },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      );

      console.log('✅ Notification sent successfully', { timestamp: new Date().toISOString() });
      console.log('✅ Notification response', { response });

    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }


  // הקוד הקיים נשאר ללא שינוי
  // async requestSubscription() {
  //   console.log('🔄 Loading VAPID Public Key before subscription...');
  //   let subscription = await this.getLatestSubscription();
  //   if (subscription) {
  //     console.log('✅ Found existing subscription in the server:', subscription);
  //     return subscription;
  //   }

  //   console.log('🚀 No valid subscription found. Requesting a new one...');
  //   await this.loadVapidPublicKey();
  //   if (!this.VAPID_PUBLIC_KEY) {
  //     console.error('❌ Failed to load VAPID Public Key. Aborting subscription.');
  //     return null;
  //   }
  //   console.log('✅ Frontend VAPID Public Key Loaded:', this.VAPID_PUBLIC_KEY);

  //   console.log('🔔 Attempting to request subscription', {
  //     timestamp: new Date().toISOString()
  //   });
  //   try {
  //     // בדיקות תמיכה
  //     if (!('serviceWorker' in navigator)) {
  //       console.warn('Service Worker not supported');
  //       return null;
  //     }

  //     if (!this.swPush.isEnabled) {
  //       console.warn('Push notifications are not enabled');
  //       return null;
  //     }
  //     console.log('🚀 Requesting subscription with VAPID key', {
  //       publicKey: this.VAPID_PUBLIC_KEY ? '✅ Present' : '❌ Missing'
  //     });

  //     // קבל את הטוקן מהסטורג'
  //     // const token = localStorage.getItem('loginToken');

  //     // // בדיקת תקינות הטוקן
  //     // if (!token) {
  //     //   console.error('No login token found. Please log in.');
  //     //   return null;
  //     // }

  //     subscription = await this.swPush.requestSubscription({
  //       serverPublicKey: this.VAPID_PUBLIC_KEY
  //     });

  //     console.log('📡 Subscription received', {
  //       endpoint: subscription.endpoint,
  //       keys: subscription.toJSON()?.keys ?
  //         Object.keys(subscription.toJSON()!.keys!) :
  //         'No keys found'
  //     });
  //     console.log('Got subscription:', {
  //       endpoint: subscription.endpoint,
  //       keys: subscription.toJSON()?.keys ? Object.keys(subscription.toJSON()!.keys!) : 'No keys found'
  //     });

  //     // שלח עם הטוקן בheaders
  //     // const response = await this.http.post(
  //     //   `${config.baseURL}/notification`,
  //     //   { subscription },
  //     //   {
  //     //     withCredentials: true, // 🔹 שולח את הקוקיז אוטומטית
  //     //     headers: { 'Content-Type': 'application/json' },
  //     //     observe: 'response'
  //     //   }
  //     // ).toPromise();
  //     const response = await firstValueFrom(this.http.post(
  //       `${config.baseURL}/notification`,
  //       { subscription },
  //       {
  //         withCredentials: true,
  //         headers: { 'Content-Type': 'application/json' },
  //         observe: 'response'
  //       }
  //     ));

  //     console.log('Subscription response:', {
  //       status: response?.status,
  //       statusText: response?.statusText
  //     });

  //     return subscription;
  //   } catch (err: unknown) {
  //     // טיפול מסודר בשגיאות
  //     if (err instanceof HttpErrorResponse) {
  //       console.error('🚨 HTTP Error details', {
  //         status: err.status,
  //         message: err.message,
  //         error: err.error
  //       });

  //       if (err.status === 401) {
  //         localStorage.removeItem('loginToken');
  //         // ניתן להוסיף הפניה להתחברות מחדש
  //       }
  //     } else if (err instanceof Error) {
  //       console.error('General Error:', {
  //         name: err.name,
  //         message: err.message
  //       });
  //     } else {
  //       console.error('Unknown error:', err);
  //     }

  //     // זריקת השגיאה הלאה
  //     throw err;
  //   }
  // }
  // async requestSubscription() {
  //   console.log('🔄 Checking existing subscription...');
  //   let token = await this.firebaseService.getFCMToken();

  //   if (token) {
  //     console.log('✅ Found existing token:', token);
  //     return token;
  //   }

  //   console.log('🚀 No valid token found. Requesting a new one...');
  //   try {
  //     token = await this.firebaseService.getFCMToken();

  //     if (!token) {
  //       console.error('❌ Failed to retrieve FCM token. Aborting subscription.');
  //       return null;
  //     }

  //     console.log('📡 Token received:', token);

  //     // שליחת ה-Token לשרת
  //     await this.saveSubscription({ token });

  //     return token;
  //   } catch (error) {
  //     console.error('❌ Error requesting FCM token:', error);
  //     throw error;
  //   }
  // }
  async requestSubscription(): Promise<string | null> {
    if (this.isSubscriptionRequested) {
      console.log("🔄 Subscription כבר בוצעה. לא מבצע בקשה חוזרת.");
      return await this.firebaseService.getFCMToken();
    }

    this.isSubscriptionRequested = true;

    console.log('🔄 Checking existing subscription...');
    let token = await this.firebaseService.getFCMToken();

    if (token) {
      console.log('✅ Found existing token:', token);
      return token;
    }

    console.log('🚀 No valid token found. Requesting a new one...');
    try {
      token = await this.firebaseService.getFCMToken();
      if (!token) {
        console.error('❌ Failed to retrieve FCM token. Aborting subscription.');
        return null;
      }

      console.log('📡 Token received:', token);
      await this.saveSubscription({ token });

      return token;
    } catch (error) {
      console.error('❌ Error requesting FCM token:', error);
      return null;
    }
  }


  async getExistingSubscription() {
    console.log('🔄 Fetching existing subscription from server...');
    try {
      const response: any = await firstValueFrom(this.http.get(
        `${config.baseURL}/notification/get-subscription`,
        { withCredentials: true }
      ));

      if (response.subscription) {
        console.log('✅ Existing Subscription:', response.subscription);
        return response.subscription;
      } else {
        console.warn('⚠️ No subscription found in DB');
        return null;
      }
    } catch (err) {
      console.error('❌ Failed to fetch existing subscription:', err);
      return null;
    }
  }


  async loadVapidPublicKey(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<{ vapidPublicKey: string }>(`${config.baseURL}/notification/vapid-public-key`));
      this.VAPID_PUBLIC_KEY = response.vapidPublicKey;
      console.log('✅ Loaded VAPID Public Key from server:', this.VAPID_PUBLIC_KEY);
    } catch (err) {
      console.error('❌ Failed to load VAPID Public Key:', err);
    }
  }


  // הוספת פונקציית העזר לשירות
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    console.log('🔑 Converting Base64 to Uint8Array', {
      inputLength: base64String.length
    });

    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    console.log('✅ Conversion complete', {
      outputLength: outputArray.length
    });

    return outputArray;
  }
  startKeepAliveNotifications(): void {
    setInterval(async () => {
      console.log("🔄 שולח נוטיפיקציה דרך Firebase");

      await this.sendNotification({
        title: "🔄 עדכון רקע",
        body: "בודקים אם האפליקציה עדיין מחוברת...",
        wakeUpApp: true, // ⬅️ שדה חשוב! Service Worker יתפוס את זה
        silent: true // ⬅️ כדי שהמשתמש לא יראה את כל ה-Keep Alive
      });
    }, 5 * 60 * 1000); // ⏳ כל 5 דקות
  }


  // האזנה להודעות Push
  getMessages(): Observable<any> {
    console.log('🖱️ Listening to Notification Clicks', {
      timestamp: new Date().toISOString()
    });
    return this.swPush.messages;
  }

  // האזנה ללחיצות על נוטיפיקציות
  getNotificationClicks(): Observable<any> {
    return this.swPush.notificationClicks;
  }

  // בדיקה אם נוטיפיקציות מאופשרות
  isPushEnabled(): boolean {
    return this.swPush.isEnabled;
  }
}
import { inject, Injectable, Injector } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';

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
    private tokenSubject = new BehaviorSubject<string | null>(null);
    readonly vapidKey = "BJ0eDoKaqa38VXNfTokyeUKpM0OA9RflAK0gMkjeA-ddZlCYvE02m5YZa7ESS8dujQL-4S_67puRZJVP5Y_CYuo"; // וודא שזה המפתח הנכון
    private injector = inject(Injector);
    private _notificationService: NotificationService | null = null;
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

    // רישום ה-Service Worker כדי לקבל נוטיפיקציות גם כשהאפליקציה לא פתוחה
    private async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
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
    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log("🔔 Notification permission granted.");
                this.getFCMToken();
            } else {
                console.warn("❌ Notification permission denied.");
            }
        } catch (error) {
            console.error("❌ Error getting notification permission:", error);
        }
    }

    // קבלת ה-FCM Token ושליחתו לשרת
    async getFCMToken(): Promise<string | null> {
        try {
            const token = await getToken(this.messaging, { vapidKey: this.vapidKey });
            console.log("✅ first:", token);
            if (token) {
                console.log("✅ FCM Token received:", token);
                this.tokenSubject.next(token);
                //await this.sendTokenToServer(token);
                await this.notificationService.saveSubscription({ token });
                return token; // ✅ עכשיו הפונקציה מחזירה את ה-Token
            } else {
                console.warn("⚠️ No FCM token received.");
                return null;
            }
        } catch (error) {
            console.error("❌ Error retrieving FCM token:", error);
            return null;
        }
    }


    // מאזין לנוטיפיקציות כשהאפליקציה **פתוחה**
    listenForMessages() {
        onMessage(this.messaging, (payload) => {
            console.log("📩 Foreground notification received:", payload);
            new Notification(payload.notification?.title ?? "New Notification", {
                body: payload.notification?.body,
                icon: payload.notification?.icon
            });
        });
    }

    // שליחת ה-Token לשרת לשימוש עתידי
    async sendTokenToServer(token: string) {
        try {
            const response = await fetch('http://localhost:3030/api/notification/save-token', {
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

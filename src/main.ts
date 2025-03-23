import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { FirebaseService } from './app/services/firebase.service'; // ✅ שימוש בשירות Firebase
import { inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';





platformBrowserDynamic().bootstrapModule(AppModule).then(() => {
  //const firebaseService = inject(FirebaseService); // ✅ יוצרים מופע של FirebaseService

  if ('serviceWorker' in navigator) {
    console.log("Platform:", Capacitor.getPlatform());
    window.addEventListener('load', async () => {
      try {
        // ✅ רישום ה-Service Worker של Firebase
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Firebase Service Worker Registered:', registration);

        // [RED] בדיקה אם Notification קיים והפלטפורמה היא web
        if (Capacitor.getPlatform() === 'web' && typeof Notification !== 'undefined') {
          console.log("Platform:", Capacitor.getPlatform());
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('⚠️ Notification permission denied.');
            return;
          }

          // ✅ קבלת ה-FCM Token ושליחתו לשרת
          // const token = await firebaseService.getFCMToken();
          // if (token) {
          //   console.log('🔑 FCM Token received:', token);
          //   await firebaseService.sendTokenToServer(token);
          // }
        } else {
          console.warn("Notification API is not available in this environment (native mode).");
        }
      } catch (error) {
        console.error('❌ Error during Service Worker registration or FCM setup:', error);
      }
    });
  }
}).catch(err => console.error('❌ Bootstrap error:', err));

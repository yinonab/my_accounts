import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { FirebaseService } from './app/services/firebase.service'; // ✅ שימוש בשירות Firebase
import { inject } from '@angular/core';

platformBrowserDynamic().bootstrapModule(AppModule).then(() => {
  const firebaseService = inject(FirebaseService); // ✅ יוצרים מופע של FirebaseService

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // ✅ רישום ה-Service Worker של Firebase (במקום ngsw-worker.js)
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Firebase Service Worker Registered:', registration);

        // ✅ בקשת הרשאת נוטיפיקציות מהמשתמש
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('⚠️ Notification permission denied.');
          return;
        }

        // ✅ קבלת ה-FCM Token ושליחתו לשרת
        const token = await firebaseService.getFCMToken();
        if (token) {
          console.log('🔑 FCM Token received:', token);
          await firebaseService.sendTokenToServer(token); // שליחת ה-Token לשרת
        }
      } catch (error) {
        console.error('❌ Error during Service Worker registration or FCM setup:', error);
      }
    });
  }
}).catch(err => console.error('❌ Bootstrap error:', err));

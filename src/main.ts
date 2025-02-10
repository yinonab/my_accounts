import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { NotificationService } from './app/services/notification.service';
import { inject } from '@angular/core';

platformBrowserDynamic().bootstrapModule(AppModule).then(() => {
  const notificationService = inject(NotificationService);
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/ngsw-worker.js').then(async reg => {
        console.log('✅ Service Worker registered:', reg);


        if (!('PushManager' in window)) {
          console.warn('⚠️ Push notifications are not supported in this browser.');
          return;
        }

        let permission = Notification.permission;
        if (permission !== 'granted') {
          permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('⚠️ Notification permission denied.');
            return;
          }
        }
        const latestSubscription = await notificationService.getLatestSubscription();
        if (latestSubscription) {
          console.log('🔄 Existing Subscription from server:', latestSubscription);
          return; // אם יש מנוי – אל תיצור חדש!
        }

        try {
          console.log('🚀 No valid subscription found. Requesting a new one...');
          const newSubscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BKY_C-R9bVYH6-BWh2E2STfmB37ANCt_v3_IpAWWpNGCJG3EmUOBzn6W0ZzJaKl8xoPxMUOS2aYFqjyCFHtwZ9Y'
          });

          console.log('✅ Push Subscription:', newSubscription);

          await notificationService.saveSubscription(newSubscription);
        } catch (error) {
          console.error('❌ Error during push subscription process:', error);
        }
      }).catch(err => console.error('❌ Service Worker registration failed:', err));
      navigator.serviceWorker.register('/custom-service-worker.js').then(reg => {
        console.log('✅ Custom Service Worker Registered!', reg);
      }).catch(err => console.error('❌ Custom Service Worker registration failed:', err));
    });
  }
}).catch(err => console.error(err));

function getCookie(name: string): string | null {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='));
  return cookieValue ? cookieValue.split('=')[1] : null;
}
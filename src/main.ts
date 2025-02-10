import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule).then(() => {
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

        try {
          const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BKY_C-R9bVYH6-BWh2E2STfmB37ANCt_v3_IpAWWpNGCJG3EmUOBzn6W0ZzJaKl8xoPxMUOS2aYFqjyCFHtwZ9Y'
          });

          console.log('✅ Push Subscription:', subscription);

          const response = await fetch('http://localhost:3030/api/notification', {
            method: 'POST',
            body: JSON.stringify({ subscription }),
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include' // זה יגרום לדפדפן לשלוח את כל הקוקיז, כולל ה-HttpOnly
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log('✅ Subscription successfully sent to server.');
        } catch (error) {
          console.error('❌ Error during push subscription process:', error);
        }
      }).catch(err => console.error('❌ Service Worker registration failed:', err));
    });
  }
}).catch(err => console.error(err));

function getCookie(name: string): string | null {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='));
  return cookieValue ? cookieValue.split('=')[1] : null;
}
import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

@Injectable({
  providedIn: 'root'
})
export class NotificationMobileService {
  notificationPermission: string = 'default';

  constructor(private firebaseService: FirebaseService) {
    // בשלב האתחול, אם האובייקט Notification קיים – נבדוק את הרשאת ההתראות
    this.notificationPermission = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
  }

  async requestNotificationPermission(): Promise<void> {
    // אם הסביבה web – נשתמש ב-Notification.requestPermission()
    if (Capacitor.getPlatform() === 'web' && typeof Notification !== 'undefined') {
      try {
        const permission = await Notification.requestPermission();
        console.log("🔔 Web notification permission:", permission);
        if (permission === 'granted') {
          const token = await this.firebaseService.getFCMToken();
          if (!token) {
            console.warn("No valid FCM token received; not sending to server.");
          }
        } else if (permission === 'denied') {
          console.warn("❌ Notification permission denied.");
          this.showManualEnableInstructions();
        } else {
          console.log("ℹ️ Notification permission default.");
        }
      } catch (error) {
        console.error("❌ Error getting web notification permission:", error);
      }
    } else {
      // בסביבה native – נשתמש בפלאגין PushNotifications
      try {
        console.log("Requesting native push notifications permission...");
        const permissionResult = await PushNotifications.requestPermissions();
        if (permissionResult.receive === 'granted') {
          // אם אושרה ההרשאה, נרשם להתראות
          await PushNotifications.register();

          // מאזינים לקבלת הטוקן
          PushNotifications.addListener('registration', (tokenData) => {
            console.log("✅ Native push registration token:", tokenData);
            // שלח את הטוקן לשרת, אם צריך
            this.firebaseService.sendTokenToServer(tokenData.value);
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

  /**
   * תצוגה של הנחיה ידנית אם המשתמש חסם התראות
   */
  showManualEnableInstructions() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const settingsUrl = "chrome://settings/content/notifications";
      alert("🔕 נראה שחסמת התראות. לחץ על 'אישור' כדי לגשת ישירות להגדרות ולפעול אותן.");
      window.open(settingsUrl, "_blank");
    } else {
      alert("🔕 נראה שחסמת התראות לאתר זה. כדי להפעיל אותן, גש להגדרות הדפדפן שלך והפעל התראות באופן ידני.");
    }
  }

  showNotificationPrompt() {
    if (document.querySelector('.notification-prompt')) return; // מניעת כפילויות

    const prompt = document.createElement('div');
    prompt.className = 'notification-prompt';
    prompt.innerHTML = `
        <div class="notification-alert">
          🔔 כדי לקבל התראות, אפשר הודעות!
          <div class="notification-actions">
            <button id="allow-btn">📩 אפשר התראות</button>
            <button id="dismiss-btn">❌ לא עכשיו</button>
          </div>
        </div>
        <style>
          /* עיצוב קופסת ההתראה */
          .notification-prompt {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.85);
            padding: 18px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            text-align: center;
            z-index: 999;
            max-width: 320px;
            width: 90%;
            font-size: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
            animation: fadeIn 0.3s ease-in-out;
          }
          .notification-alert {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .notification-actions {
            display: flex;
            gap: 10px;
            width: 100%;
            justify-content: space-around;
            margin-top: 12px;
          }
          .notification-actions button {
            flex: 1;
            padding: 10px 15px;
            font-size: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s ease-in-out, transform 0.2s;
          }
          #allow-btn {
            background: #4CAF50;
            color: white;
          }
          #allow-btn:hover {
            background: #45A049;
            transform: scale(1.05);
          }
          #dismiss-btn {
            background: #f44336;
            color: white;
          }
          #dismiss-btn:hover {
            background: #d32f2f;
            transform: scale(1.05);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        </style>
      `;
    document.body.appendChild(prompt);

    document.getElementById('allow-btn')?.addEventListener('click', async () => {
      console.log("🟢 לחיצה על 'אפשר התראות'");
      if (Capacitor.getPlatform() === 'web' && typeof Notification !== 'undefined') {
        try {
          const permission = await Notification.requestPermission();
          console.log("🔔 Web notification permission received:", permission);
          if (permission === 'granted') {
            await this.requestNotificationPermission();
          }
        } catch (error) {
          console.error("❌ Error during web notification prompt:", error);
        }
      } else {
        console.warn("Notifications API not available in this environment.");
      }
      prompt.remove();
    });

    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      console.log('🔕 המשתמש דחה את הבקשה');
      prompt.remove();
    });

    localStorage.setItem('notificationsPrompted', 'true');
  }
}

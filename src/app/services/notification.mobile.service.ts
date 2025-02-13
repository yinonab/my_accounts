import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';

@Injectable({
    providedIn: 'root'
})
export class NotificationMobileService {
    notificationPermission: string = 'default';

    constructor(private firebaseService: FirebaseService) {
        this.notificationPermission = Notification.permission;
    }

    async requestNotificationPermission() {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            console.warn("❌ הדפדפן לא תומך בהתראות.");
            return;
        }

        const permission = await Notification.requestPermission();
        console.log("🔔 הרשאת התראות:", permission);

        if (permission === 'granted') {
            console.log("✅ הרשאה אושרה! מקבלים FCM Token...");
            this.firebaseService.getFCMToken();
        } else if (permission === 'denied') {
            console.warn("⚠️ המשתמש דחה את הבקשה, נבקש ממנו להפעיל ידנית.");
            this.showManualEnableInstructions();
        } else {
            console.log("ℹ️ המשתמש לא בחר הרשאה.");
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
        if (localStorage.getItem('notificationsPrompted')) return;

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

          /* עיצוב הכותרת */
          .notification-alert {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          /* עיצוב כפתורי הפעולה */
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

          /* כפתור אישור */
          #allow-btn {
            background: #4CAF50;
            color: white;
          }

          #allow-btn:hover {
            background: #45A049;
            transform: scale(1.05);
          }

          /* כפתור ביטול */
          #dismiss-btn {
            background: #f44336;
            color: white;
          }

          #dismiss-btn:hover {
            background: #d32f2f;
            transform: scale(1.05);
          }

          /* אנימציה להופעת ההתראה */
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        </style>
      `;

        document.body.appendChild(prompt);

        document.getElementById('allow-btn')?.addEventListener('click', async () => {
            await this.requestNotificationPermission();
            prompt.remove();
        });

        document.getElementById('dismiss-btn')?.addEventListener('click', () => {
            console.log('🔕 המשתמש דחה את הבקשה');
            prompt.remove();
        });

        localStorage.setItem('notificationsPrompted', 'true');
    }
}

import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';

// 🔹 הגדרת ממשק הפלאגין שיתאים למבנה שלו
export interface BackgroundServicePlugin {
  startService(): Promise<void>;
  stopService(): Promise<void>;
  startForegroundService(): Promise<void>;  // ✅ הוספת תמיכה ב-Foreground
  stopForegroundService(): Promise<void>;   // ✅ הוספת תמיכה ב-Foreground

  saveUserData(options: { userId: string; fcmToken: string }): Promise<{ success: boolean }>;

  sendNotificationFromPlugin(data: {
    title: string;
    body: string;
    token: string;
    channelId: string;
  }): Promise<{ success: boolean }>;
}

// 🔹 רישום הפלאגין עם סוג מוגדר
const BackgroundService = registerPlugin<BackgroundServicePlugin>('BackgroundService');

@Injectable({
  providedIn: 'root'
})
export class BackgroundServiceService {
  constructor() {}

  // ✅ הפעלת השירות ברקע
  async startService() {
    try {
      await BackgroundService.startService();
      console.log('✅ Background service started');
    } catch (error) {
      console.error('❌ Error starting background service:', error);
    }
  }

  // ✅ עצירת השירות ברקע
  async stopService() {
    try {
      await BackgroundService.stopService();
      console.log('✅ Background service stopped');
    } catch (error) {
      console.error('❌ Error stopping background service:', error);
    }
  }

  // ✅ הפעלת השירות במצב Foreground (מניעת סגירה של האפליקציה)
  async startForegroundService() {
    try {
      await BackgroundService.startForegroundService();
      console.log('🚀 Foreground service started');
    } catch (error) {
      console.error('❌ Error starting foreground service:', error);
    }
  }

  // ✅ עצירת ה-Foreground Service (החזרה לרקע)
  async stopForegroundService() {
    try {
      await BackgroundService.stopForegroundService();
      console.log('🛑 Foreground service stopped');
    } catch (error) {
      console.error('❌ Error stopping foreground service:', error);
    }
  }
  // ✅ שמירת userId ו-fcmToken דרך הפלאגין
async saveUserData(userId: string, fcmToken: string): Promise<void> {
  try {
    const result = await BackgroundService.saveUserData({ userId, fcmToken });
    if (result?.success) {
      console.log('✅ User data saved via plugin');
    } else {
      console.warn('⚠️ Plugin returned failure saving user data');
    }
  } catch (error) {
    console.error('❌ Error saving user data via plugin:', error);
  }
}

async sendNotificationFromPlugin(title: string, body: string, token: string, channelId: string): Promise<void> {
  try {
    const result = await BackgroundService.sendNotificationFromPlugin({ title, body, token, channelId });
    if (result?.success) {
      console.log('✅ Notification sent from plugin');
    } else {
      console.warn('⚠️ Plugin returned failure sending notification');
    }
  } catch (error) {
    console.error('❌ Error sending notification via plugin:', error);
  }
}


}

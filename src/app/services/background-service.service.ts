import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';

// 🔹 הגדרת ממשק הפלאגין שיתאים למבנה שלו
export interface BackgroundServicePlugin {
  startService(): Promise<void>;
  stopService(): Promise<void>;
  startForegroundService(): Promise<void>;  // ✅ הוספת תמיכה ב-Foreground
  stopForegroundService(): Promise<void>;   // ✅ הוספת תמיכה ב-Foreground
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
}

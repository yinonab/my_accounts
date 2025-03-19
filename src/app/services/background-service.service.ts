import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';

// 🔹 הגדרת ממשק הפלאגין שיתאים למבנה שלו
export interface BackgroundServicePlugin {
  startService(): Promise<void>;
  stopService(): Promise<void>;
}

// 🔹 רישום הפלאגין עם סוג מוגדר
const BackgroundService = registerPlugin<BackgroundServicePlugin>('BackgroundService');

@Injectable({
  providedIn: 'root'
})
export class BackgroundServiceService {
  constructor() {}

  async startService() {
    try {
      await BackgroundService.startService();
      console.log('✅ Background service started');
    } catch (error) {
      console.error('❌ Error starting background service:', error);
    }
  }

  async stopService() {
    try {
      await BackgroundService.stopService();
      console.log('✅ Background service stopped');
    } catch (error) {
      console.error('❌ Error stopping background service:', error);
    }
  }
}

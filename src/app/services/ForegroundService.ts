import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

// רישום הפלאגין שלנו
export interface BackgroundServicePlugin {
  start(): Promise<{ message: string }>;
  stop(): Promise<{ message: string }>;
}

const BackgroundService = registerPlugin<BackgroundServicePlugin>('BackgroundService');

@Injectable({
  providedIn: 'root'
})
export class ForegroundService {
  
  async startService() {
    if (Capacitor.getPlatform() !== 'android') {
      console.warn("⚠️ Foreground Service נתמך רק באנדרואיד");
      return;
    }

    try {
      await BackgroundService.start();
      console.log("🚀 Foreground Service started");
    } catch (error) {
      console.error("❌ Foreground Service failed to start", error);
    }
  }

  async stopService() {
    try {
      await BackgroundService.stop();
      console.log("🛑 Foreground Service stopped");
    } catch (error) {
      console.error("❌ Failed to stop Foreground Service", error);
    }
  }
}
export default BackgroundService;


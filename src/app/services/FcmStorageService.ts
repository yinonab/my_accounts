import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class FcmStorageService {
  private fileName = 'fcm-backup.txt';
  private preferencesKeyUserId = 'userId';
  private preferencesKeyFcmToken = 'fcmToken';

  /**
   * Save data to Preferences and fallback to internal file
   */
  async save(userId: string, fcmToken: string): Promise<void> {
    try {
      await Preferences.set({ key: this.preferencesKeyUserId, value: userId });
      await Preferences.set({ key: this.preferencesKeyFcmToken, value: fcmToken });
      console.log('✅ Saved to Preferences');
    } catch (e) {
      console.warn('⚠️ Preferences save failed.', e);
    }
  
    try {
      await this.saveToFile(userId, fcmToken);
    } catch (e) {
      console.error("❌ Failed to save to backup file", e);
    }
  }
  

  /**
   * Retrieve data from Preferences or fallback to file
   */
  async get(): Promise<{ userId: string; fcmToken: string } | null> {
    try {
      const { value: userId } = await Preferences.get({ key: this.preferencesKeyUserId });
      const { value: fcmToken } = await Preferences.get({ key: this.preferencesKeyFcmToken });
      if (userId && fcmToken) {
        console.log('✅ Loaded from Preferences');
        return { userId, fcmToken };
      }
      throw new Error('No data in Preferences');
    } catch (e) {
      console.warn('⚠️ Preferences get failed. Falling back to file.', e);
      return await this.readFromFile();
    }
  }

  /**
   * Save to internal file if Preferences unavailable
   */
  private async saveToFile(userId: string, fcmToken: string): Promise<void> {
    const content = `${userId}|${fcmToken}`;
    try {
      await Filesystem.writeFile({
        path: this.fileName,
        data: content,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      console.log('✅ Saved to file');
    } catch (e) {
      console.error('❌ Failed to write to file', e);
    }
  }

  /**
   * Read backup from file if Preferences failed
   */
  private async readFromFile(): Promise<{ userId: string; fcmToken: string } | null> {
    try {
      const result = await Filesystem.readFile({
        path: this.fileName,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      const contents = result.data as string;
      const [userId, fcmToken] = contents.split('|');

      if (userId && fcmToken) {
        console.log('✅ Loaded from file');
        return { userId, fcmToken };
      } else {
        console.warn('⚠️ File exists but data invalid');
        return null;
      }
    } catch (e) {
      console.error('❌ Failed to read from file', e);
      return null;
    }
  }
}

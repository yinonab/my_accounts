import { WebPlugin } from '@capacitor/core';
import { BackgroundServicePlugin } from './definitions';

export class BackgroundServiceWeb extends WebPlugin implements BackgroundServicePlugin {
    async startService(): Promise<void> {
        console.log('Background service is not available on web');
    }

    async stopService(): Promise<void> {
        console.log('Background service stopped (web)');
    }
}

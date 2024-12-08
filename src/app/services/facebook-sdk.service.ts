import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FacebookSdkService {
  loadFacebookSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('facebook-jssdk')) {
        console.log('Facebook SDK already loaded.');
        resolve(); // Resolve if already loaded
        return;
      }

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.onload = () => {
        console.log('Facebook SDK loaded successfully.');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Facebook SDK.');
        reject('Failed to load Facebook SDK.');
      };

      document.body.appendChild(script);
    });
  }
}

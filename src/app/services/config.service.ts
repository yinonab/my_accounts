import { Capacitor } from '@capacitor/core';

const developmentHosts = ['localhost', '192.168.1.88', '192.168.1.63', '10.0.2.2', '10.100.102.9'];
const isProduction = !developmentHosts.includes(window.location.hostname);

export const config = {
  baseURL: (function() {
    // אם האפליקציה נייטיבית (למשל באמולטור), נשתמש בכתובת מתאימה
    if (Capacitor.getPlatform() !== 'web' && window.location.hostname === 'localhost') {
      return 'http://10.0.2.2:3030/api';
    }
    return isProduction
      ? 'https://backend-my-accounts.onrender.com/api'
      : `http://${window.location.hostname}:3030/api`;
  })(),
  notifications: {
    vapidPublicKey: 'BKY_C-R9bVYH6-BWh2E2STfmB37ANCt_v3_IpAWWpNGCJG3EmUOBzn6W0ZzJaKl8xoPxMUOS2aYFqjyCFHtwZ9Y'
  }
};

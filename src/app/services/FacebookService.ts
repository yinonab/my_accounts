import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';
import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';



declare var FB: any;

@Injectable({
    providedIn: 'root',
})
export class FacebookService {
    constructor() {
        if (!Capacitor.isNativePlatform()) {
            this.initFacebookSDK();
        }
    }

    private initFacebookSDK(): void {
        (window as any).fbAsyncInit = function () {
            FB.init({
                appId: '2280747752304909',
                cookie: true,
                xfbml: true,
                version: 'v21.0',
            });
            FB.AppEvents.logPageView();
        };

        (function (d: Document, s: string, id: string) {
            const js = d.createElement(s) as HTMLScriptElement;
            const fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js.id = id;
            js.src = 'https://connect.facebook.net/en_US/sdk.js';
            fjs.parentNode?.insertBefore(js, fjs);
        })(document, 'script', 'facebook-jssdk');
    }

    async login(scope: string = 'email,public_profile'): Promise<any> {
        if (Capacitor.isNativePlatform()) {
            return this.loginWithCapacitor(); // 🔹 הוספה חדשה
        } else {
            return this.loginWithSDK(scope);
        }
    }

    /**
     * לוגין דרך Facebook SDK כאשר מדובר בדפדפן
     */
    private loginWithSDK(scope: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (typeof FB === 'undefined') {
                return reject('Facebook SDK not loaded.');
            }
            FB.login((response: any) => {
                console.log("🔹 FB.login response (Web):", response); 
                if (response.authResponse) {
                    resolve(response.authResponse);
                } else {
                    console.warn("❌ User cancelled login or did not authorize.");
                    reject('User cancelled login or did not authorize.');
                }
            }, { scope });
        });
    }

    /**
     * לוגין באמצעות Capacitor כאשר מדובר באפליקציה נייטיבית
     */
    // private async loginWithCapacitor(): Promise<{ accessToken: string } | null> {
    //     try {
    //         const result: FacebookLoginResponse = await FacebookLogin.login({ permissions: ['email', 'public_profile'] });
    //         console.log("✅ Facebook login response:", result);
    
    //         if (result.accessToken) {
    //             console.log("✅ Facebook login successful (Capacitor)", result.accessToken.token);
    //             await this.saveLoginToken(result.accessToken.token);
                
    
    //             // 🔄 בדיקה מיד אחרי השמירה – האם אפשר לשלוף את הטוקן?
    //             const token = await this.getLoginToken();
    //             if (token) {
    //                 console.log("🔄 Fetching user data manually with stored token...");
    //                 const userData = await this.fetchFacebookUserData(token);
    //                 console.log("✅ Manually fetched user data:", userData);
    //             } else {
    //                 console.warn("❌ Token was not retrieved after saving!");
    //             }
    
    //             return await this.fetchFacebookUserData(result.accessToken.token);
    //         } else {
    //             console.warn("❌ Facebook login failed or cancelled (Capacitor).");
    //             return null;
    //         }
    //     } catch (error) {
    //         console.error("❌ Error with Facebook login (Capacitor):", error);
    //         return null;
    //     }
    // }

    async loginWithCapacitor(): Promise<{ accessToken: string } | null> {
        try {
            const result: FacebookLoginResponse = await FacebookLogin.login({ permissions: ['email', 'public_profile'] });
            console.log("✅ Facebook login response:", result);
    
            if (result.accessToken) {
                console.log("✅ Facebook login successful (Capacitor)", result.accessToken.token);
    
                // 🔹 קודם שומרים את הטוקן
                await this.saveLoginToken(result.accessToken.token);
                console.log("🔍 Token saved successfully.");
    
                // 🔄 מנסים לשלוף את הטוקן עם ריטריי
                const token = await this.retryGetLoginToken(3, 15000); // 3 ניסיונות עם 500ms השהיה
                if (!token) {
                    console.warn("❌ Token retrieval failed after saving!");
                    return null;
                }
    
                console.log("🔄 Fetching user data manually with stored token...");
                const userData = await this.fetchFacebookUserData(token);
                console.log("✅ Manually fetched user data:", userData);
    
                return userData;
            } else {
                console.warn("❌ Facebook login failed or cancelled (Capacitor).");
                return null;
            }
        } catch (error) {
            console.error("❌ Error with Facebook login (Capacitor):", error);
            return null;
        }
    }
    private async retryGetLoginToken(maxAttempts: number, delayMs: number): Promise<string | null> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const token = await this.getLoginToken();
            if (token) {
                console.log(`✅ Token retrieved successfully on attempt ${attempt}:`, token);
                return token;
            }
    
            console.warn(`⚠️ Attempt ${attempt} failed to retrieve token. Retrying in ${delayMs}ms...`);
            await this.sleep(delayMs);
        }
    
        console.error("❌ All token retrieval attempts failed.");
        return null;
    }
    
    // פונקציה ליצירת השהיה בין ניסיונות
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    
     async fetchFacebookUserData(accessToken: string): Promise<any> {
        try {
            const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
            const data = await response.json();
            console.log("✅ Facebook User Data from API:", data);
            
            return {
                facebookId: data.id,
                name: data.name,
                email: data.email || '',
                accessToken
            };
        } catch (error) {
            console.error("❌ Failed to fetch Facebook user data:", error);
            throw new Error("Failed to fetch Facebook user data");
        }
    }
    
    async saveLoginToken(token: string) {
        console.log("📦 Trying to securely save token:", token);
    
        try {
            await SecureStoragePlugin.set({ key: 'facebook_login_token', value: token });
            console.log("✅ Token securely saved in Secure Storage.");
            const result = await SecureStoragePlugin.get({ key: 'facebook_login_token' });
            console.log("🔍 Token after saving:", result.value);
        } catch (error) {
            console.error("❌ Failed to save token in Secure Storage, falling back to Preferences:", error);
            await Preferences.set({ key: 'facebook_login_token', value: token });
        }
    
        // גיבוי נוסף (אם נדרש)
        localStorage.setItem("facebook_login_token", token);
    }
    
    
    // async getLoginToken(): Promise<string | null> {
    //     let token: string | null = null;
    
    //     try {
    //         const result = await SecureStoragePlugin.get({ key: 'facebook_login_token' });
    //         token = result.value;
    //         console.log("🔑 Retrieved Token from Secure Storage:", token);
    //     } catch (error) {
    //         console.warn("⚠️ Secure Storage not available or token missing. Trying Preferences...", error);
    //         token = (await Preferences.get({ key: 'facebook_login_token' })).value;
    //     }
    
    //     if (!token) {
    //         console.warn("❌ Token not found in Preferences! Trying localStorage...");
    //         token = localStorage.getItem("facebook_login_token");
    //     }
    
    //     console.log("📦 Final Retrieved Token:", token);
    //     return token;
    // }
    private async isTokenValid(token: string): Promise<boolean> {
        try {
            // ננסה להביא את נתוני המשתמש עם הטוקן
            const userData = await this.fetchFacebookUserData(token);
            console.log("✅ Token is valid! User data:", userData);
            return true;
        } catch (error) {
            console.warn("⚠️ Token might not be valid yet. Error:", error);
            return false;
        }
    }
    
    async getLoginToken(): Promise<string | null> {
        let token: string | null = null;
        let attempts = 0;
        const maxAttempts = 5;
    
        while (attempts < maxAttempts) {
            try {
                console.log(`🔄 Attempt ${attempts + 1} to retrieve and validate token...`);
    
                // 1️⃣ ניסיון לשלוף את הטוקן ממקורות שונים
                token = (await SecureStoragePlugin.get({ key: 'facebook_login_token' })).value;
                if (!token) token = (await Preferences.get({ key: 'facebook_login_token' })).value;
                if (!token) token = localStorage.getItem("facebook_login_token");
    
                if (token) {
                    console.log("🔍 Found Token:", token);
    
                    // 2️⃣ בדיקה אם אפשר להשתמש בטוקן
                    if (await this.isTokenValid(token)) {
                        console.log("✅ Token is valid and ready to use:", token);
                        return token; // מחזירים את הטוקן התקף
                    } else {
                        console.warn("⚠️ Token found but not valid, retrying...");
                    }
                }
    
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempts + 1} failed. Error retrieving token:`, error);
            }
    
            attempts++;
            if (attempts < maxAttempts) {
                console.log("⏳ Retrying in 500ms...");
                await new Promise(resolve => setTimeout(resolve, 500)); // מחכים 500ms לפני ניסיון נוסף
            }
        }
    
        console.error("❌ No valid token found after multiple attempts.");
        return null;
    }
    
    
    

    async checkFacebookLoginState(): Promise<void> {
        try {
            if (Capacitor.isNativePlatform()) {
                const result = await FacebookLogin.getCurrentAccessToken();
                console.log("🔹 Facebook Current Access Token:", result);
    
                if (result?.accessToken) {
                    console.log("✅ User is still logged in with Facebook.");
                } else {
                    console.warn("⚠️ User is NOT logged in. Checking stored token...");
    
                    let token = await this.getLoginToken();
                    if (!token) {
                        console.warn("⚠️ Token not found in Preferences, checking localStorage...");
                        token = localStorage.getItem("facebook_login_token"); // 🔹 גיבוי נוסף
                    }
    
                    console.log("🔍 Stored Token found:", token ? "✅ Yes" : "❌ No");
    
                    if (token) {
                        console.log("🔄 Fetching user data manually with stored token...");
                        const userData = await this.fetchFacebookUserData(token);
                        console.log("✅ Manually fetched user data:", userData);
                    } else {
                        console.warn("❌ Token not found in any source – user must log in again.");
                    }
                }
            } else {
                console.log("⚠️ Facebook SDK does not support `getCurrentAccessToken` in web.");
            }
        } catch (error) {
            console.error("❌ Error checking Facebook login state:", error);
        }
    }
    
    
    
    

    /**
     * יציאה מחשבון הפייסבוק
     */
    async logout(): Promise<void> {
        console.log("🔄 Logging out...");
    
        if (Capacitor.isNativePlatform()) {
            await this.logoutWithCapacitor();
        } else {
            this.logoutWithSDK();
        }
    
        // 📦 מחיקת הטוקן מכל המקומות
        await SecureStoragePlugin.remove({ key: 'facebook_login_token' }).catch(() => {});
        await Preferences.remove({ key: 'facebook_login_token' });
        localStorage.removeItem("facebook_login_token");
    
        console.log("🗑️ Token removed from Secure Storage, Preferences, and localStorage.");
    
        // 🔍 בדיקה אם המשתמש באמת מנותק
        if (Capacitor.isNativePlatform()) {
            const result = await FacebookLogin.getCurrentAccessToken();
            if (result?.accessToken) {
                console.warn("⚠️ Logout failed! User still has an active token:", result.accessToken.token);
            } else {
                console.log("✅ Successfully logged out. No active Facebook token found.");
            }
        }
    }

    /**
     * יציאה מחשבון הפייסבוק באמצעות Facebook SDK בדפדפן
     */
    private logoutWithSDK(): void {
        if (typeof FB !== 'undefined') {
            FB.logout(() => console.log('✅ Logged out from Facebook SDK (Web)'));
        }
    }

    /**
     * יציאה מחשבון הפייסבוק באמצעות Capacitor כאשר מדובר באפליקציה נייטיבית
     */
    private async logoutWithCapacitor(): Promise<void> {
        try {
            await FacebookLogin.logout();
            console.log("✅ Logged out from Facebook (Capacitor)");
        } catch (error) {
            console.error("❌ Error logging out from Facebook (Capacitor):", error);
        }
    }


    // login(scope: string = 'email,public_profile'): Promise<any> {
    //     return new Promise((resolve, reject) => {
    //         if (typeof FB === 'undefined') {
    //             return reject('Facebook SDK not loaded.');
    //         }
    //         FB.login((response: any) => {
    //             if (response.authResponse) {
    //                 resolve(response.authResponse);
    //             } else {
    //                 reject('User cancelled login or did not authorize.');
    //             }
    //         }, { scope });
    //     });
    // }
}

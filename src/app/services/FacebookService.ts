import { Injectable } from '@angular/core';

declare var FB: any;

@Injectable({
    providedIn: 'root',
})
export class FacebookService {
    constructor() {
        this.initFacebookSDK();
    }

    private initFacebookSDK(): void {
        (window as any).fbAsyncInit = function () {
            FB.init({
                appId: '584996800678250',
                cookie: true,
                xfbml: true,
                version: 'v16.0',
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

    login(scope: string = 'email,public_profile'): Promise<any> {
        return new Promise((resolve, reject) => {
            if (typeof FB === 'undefined') {
                return reject('Facebook SDK not loaded.');
            }
            FB.login((response: any) => {
                if (response.authResponse) {
                    resolve(response.authResponse);
                } else {
                    reject('User cancelled login or did not authorize.');
                }
            }, { scope });
        });
    }
}

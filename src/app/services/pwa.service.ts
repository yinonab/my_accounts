import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PwaService {
    private deferredPrompt: any = null;
    showInstallButton = false;

    constructor() {
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log("📲 אירוע התקנה נלכד!");
            event.preventDefault();
            this.deferredPrompt = event;
            this.showInstallButton = true;
        });
    }

    installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('✅ המשתמש אישר התקנה!');
                } else {
                    console.log('❌ המשתמש ביטל התקנה.');
                }
                this.deferredPrompt = null;
                this.showInstallButton = false;
            });
        }
    }

    isRunningStandalone(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

    }

    isIOS(): boolean {
        return /iPhone|iPad|iPod/.test(navigator.userAgent);
    }
}

import { Injectable } from "@angular/core";

// device.service.ts
@Injectable({
    providedIn: 'root'
})
export class DeviceService {
    isMobile(): boolean {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'android', 'webos', 'iphone', 'ipad', 'ipod',
            'blackberry', 'windows phone', 'opera mini'
        ];
        return mobileKeywords.some(keyword => userAgent.includes(keyword));
    }

    isTablet(): boolean {
        const userAgent = navigator.userAgent.toLowerCase();
        return /ipad|android(?!.*mobile)/i.test(userAgent);
    }

    getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
        if (this.isTablet()) return 'tablet';
        if (this.isMobile()) return 'mobile';
        return 'desktop';
    }
}
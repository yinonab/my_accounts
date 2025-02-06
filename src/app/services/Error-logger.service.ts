import { Injectable } from "@angular/core";

// error-logger.service.ts
@Injectable({
    providedIn: 'root'
})
export class ErrorLoggerService {
    private logs: string[] = [];

    log(message: string, data?: any) {
        const logEntry = `${new Date().toISOString()} - ${message} ${data ? JSON.stringify(data) : ''}`;
        this.logs.push(logEntry);
        console.log(logEntry);  // הוספת הדפסה לקונסול

    }

    getLogs(): string[] {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
    }
}
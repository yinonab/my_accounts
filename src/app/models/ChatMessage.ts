// src/app/models/ChatMessage.ts
export interface ChatMessage {
    sender: string;
    senderName?: string;  // הוספת שדה אופציונלי לשם השולח
    text: string;
    toUserId?: string;
}
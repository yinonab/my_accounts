// src/app/models/ChatMessage.ts
export interface ChatMessage {
    id?: string;        // הוספנו id אופציונלי
    sender: string;
    senderName?: string;  // הוספת שדה אופציונלי לשם השולח
    text: string;
    imageUrl?: string;
    toUserId?: string;
}
import { inject, Injectable, Injector } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { UserService } from './user.service';
import { ChatMessage } from '../models/ChatMessage';

const BASE_URL = getBaseUrl();

export const SOCKET_EVENT_ADD_MSG = 'chat-add-msg';
export const SOCKET_EVENT_ADD_PRIVATE_MSG = 'chat-add-private-msg';
export const SOCKET_EMIT_SEND_MSG = 'chat-send-msg';
export const SOCKET_EMIT_SET_TOPIC = 'chat-set-topic';
export const SOCKET_EMIT_USER_WATCH = 'user-watch';
export const SOCKET_EVENT_USER_UPDATED = 'user-updated';
export const SOCKET_EVENT_REVIEW_ADDED = 'review-added';
export const SOCKET_EVENT_REVIEW_ABOUT_YOU = 'review-about-you';
export const SOCKET_EMIT_SEND_PRIVATE_MSG = 'chat-send-private-msg';

const SOCKET_EMIT_LOGIN = 'set-user-socket';
const SOCKET_EMIT_LOGOUT = 'unset-user-socket';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private injector: Injector;
  public privateMessagesBuffer: ChatMessage[] = []; // עדכון הטיפוס


  constructor(injector: Injector) {
    this.injector = injector;
  }

  private get userService(): UserService {
    return this.injector.get(UserService);
  }

  /**
   * אתחול חיבור ה-Socket
   */
  public setup(): void {
    console.log('SocketService setup() called');
    if (this.socket) {
      console.log('Socket already initialized');
      return;
    }

    this.socket = io(BASE_URL);
    console.log(`Connecting to Socket at: ${BASE_URL}`);

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);

      // קריאה לפונקציה לאתחול המשתמש המחובר
      this.initializeSocketConnection();
    });
  }

  /**
   * התחברות אוטומטית של משתמש מחובר
   */
  private initializeSocketConnection(): void {
    console.log('🔄 Initializing socket connection...');
    const user = this.userService.getLoggedInUser();

    if (user && user._id) {
      console.log(`🔓 Re-authenticating socket with userId: ${user._id}`);
      this.login(user._id);
    } else {
      console.warn('⚠️ No logged-in user found, skipping socket authentication.');
    }
  }

  /**
   * האזנה לאירועים
   */
  public on(eventName: string, callback: (data: any) => void): void {
    this.socket?.on(eventName, callback);
  }

  /**
   * הפסקת האזנה לאירועים
   */
  public off(eventName: string, callback?: (data: any) => void): void {
    if (!this.socket) return;
    if (!callback) {
      this.socket.removeAllListeners(eventName);
    } else {
      this.socket.off(eventName, callback);
    }
  }

  /**
   * שליחת אירועים לשרת
   */
  public emit(eventName: string, data?: any): void {
    this.socket?.emit(eventName, data);
  }

  /**
   * התחברות משתמש
   */
  // public login(userId: string): void {
  //   if (!this.socket) this.setup();
  //   this.socket?.emit(SOCKET_EMIT_LOGIN, userId);
  // }

  // ✅ הצטרפות לחדר
  public joinRoom(topic: string): void {
    if (!this.socket) this.setup();
    this.socket?.emit(SOCKET_EMIT_SET_TOPIC, topic);
  }

  // ✅ שליחת הודעה בצ'אט קבוצתי
  public sendMessage(msg: string): void {
    console.log('asdfasdasdasd');
    if (!this.socket) this.setup();

    const user = this.userService?.getLoggedInUser();
    console.log(`user: ${user}`);
    if (!user) return;

    const message = { text: msg }; // לא שולחים sender, השרת יקבע אותו לפי ה-userId
    this.socket?.emit(SOCKET_EMIT_SEND_MSG, message);
    console.log(`user: ${user}`);
    console.log(`message: ${message}`);
  }




  // ✅ שליחת הודעה פרטית
  // public sendPrivateMessage(toUserId: string, msg: string): void {
  //   if (!this.socket) this.setup();

  //   const user = this.userService?.getLoggedInUser();
  //   if (!user) return;

  //   const privateMessage = { text: msg, to: toUserId }; // השרת יקבע sender
  //   this.socket?.emit(SOCKET_EMIT_SEND_PRIVATE_MSG, privateMessage);
  // }

  public sendPrivateMessage(toUserId: string, msg: string): void {
    if (!this.socket) this.setup();

    const user = this.userService?.getLoggedInUser();
    if (!user || !toUserId || !msg.trim()) {
      console.warn('⚠️ Missing required data for private message:', { user, toUserId, msg });
      return;
    }

    const privateMessage = {
      toUserId: toUserId,
      text: msg,
      sender: user._id,  // חשוב להוסיף את ה-ID של השולח
      senderName: user.username  // הוספת שם המשתמש
    };

    console.log('✅ Sending private message:', privateMessage);
    this.socket?.emit(SOCKET_EMIT_SEND_PRIVATE_MSG, privateMessage);
  }






  public login(userId: string): void {
    console.log('SocketService login() called with userId:', userId);
    if (!this.socket) this.setup();
    const user = this.userService.getLoggedInUser();
    this.socket?.emit(SOCKET_EMIT_LOGIN, {
      userId: userId,
      username: user?.username || 'Anonymous' // שליחת שם המשתמש
    });
  }

  // ✅ האזנה להודעות כלליות
  public onMessage(callback: (msg: any) => void): void {
    if (!this.socket) this.setup();
    this.socket?.on(SOCKET_EVENT_ADD_MSG, callback);
  }

  // ✅ האזנה להודעות פרטיות
  public onPrivateMessage(callback: (msg: ChatMessage) => void): void {
    if (!this.socket) this.setup();

    this.socket?.on(SOCKET_EVENT_ADD_PRIVATE_MSG, (msg: ChatMessage) => {
      console.log('📩 Private message received:', msg);

      // בדיקה אם ההודעה כבר קיימת
      if (!this.privateMessagesBuffer.some(existingMsg =>
        existingMsg.text === msg.text && existingMsg.sender === msg.sender)) {
        this.privateMessagesBuffer.push(msg);
      }

      callback(msg);
    });
  }

  /**
   * מחזיר את כל ההודעות השמורות
   */
  public getPrivateMessages(): ChatMessage[] {
    // שינוי הטיפוס החזרה להיות ChatMessage
    return [...this.privateMessagesBuffer];
  }

  /**
   * איפוס ההודעות הפרטיות (כשהן נטענות לממשק)
   */
  public clearPrivateMessages(): void {
    this.privateMessagesBuffer = [];
  }

  // ✅ הפסקת האזנה להודעות
  // public off(eventName: string): void {
  //   this.socket?.off(eventName);
  // }



  /**
   * ניתוק משתמש
   */
  public logout(): void {
    this.socket?.emit(SOCKET_EMIT_LOGOUT);
  }

  /**
   * סגירת החיבור
   */
  public terminate(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

/** פונקציה לקביעת ה-URL של ה-Socket לפי סביבת ההרצה */
function getBaseUrl(): string {
  const environment = (window as any).env?.NODE_ENV || 'development';
  console.log(`Socket environment: ${environment}`);
  return environment === 'production'
    ? 'https://backend-my-accounts.onrender.com'
    : 'http://localhost:3030';
}

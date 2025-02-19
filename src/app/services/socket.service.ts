import { inject, Injectable, Injector } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { UserService } from './user.service';
import { ChatMessage } from '../models/ChatMessage';
import { ErrorLoggerService } from './Error-logger.service';

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
  private heartbeatInterval: any = null;
  private heartbeatWorker: Worker | null = null;





  constructor(injector: Injector, private errorLogger: ErrorLoggerService) {
    this.injector = injector;
  }

  private get userService(): UserService {
    return this.injector.get(UserService);
  }

  /**
   * אתחול חיבור ה-Socket
   */
  public setup(): void {
    console.log("📱 SocketService.setup() הופעלה");

    this.errorLogger.log('SocketService setup() called');
    if (this.socket) {
      this.errorLogger.log('Socket already initialized');
      return;
    }
    console.log('SocketService setup() called');
    if (this.socket) {
      console.log('Socket already initialized');
      return;
    }

    const url = getBaseUrl();
    const options = {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    };
    this.errorLogger.log('Attempting socket connection', { url, options });
    try {
      this.socket = io(url, options);
      console.log(`Connecting to Socket at: ${url}`);

      this.socket.on('connect', () => {
        this.errorLogger.log('Socket connected successfully', { socketId: this.socket?.id });
        console.log('🔌 Socket connected:', this.socket?.id);
        this.initializeSocketConnection();
        this.keepSocketAlive();
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          console.log("📱 האפליקציה חזרה לפעול, מנסה להתחבר מחדש...");
          this.setup();
        }
      });


      // הוספת ניטור שגיאות
      this.socket.on('connect_error', (error) => {
        this.errorLogger.log('Socket connection error', { error: error.message });
        console.error('Socket connection error:', error);
      });

      this.socket.on('connect_timeout', () => {
        this.errorLogger.log('Socket connection timeout');
        console.error('Socket connection timeout');
      });

      this.socket.on('disconnect', (reason) => {
        this.errorLogger.log('Socket disconnected', { reason });
        console.log('Socket disconnected:', reason);
        setTimeout(() => {
          console.log("🔄 מנסה להתחבר מחדש...");
          this.setup();
        }, 5000);
      });
    } catch (error) {
      this.errorLogger.log('Error in setup', { error });
    }
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
  public sendMessage(msg: string, imageUrl?: string): void {
    console.log('asdfasdasdasd');
    if (!this.socket) this.setup();

    const user = this.userService?.getLoggedInUser();
    console.log(`user: ${user}`);
    if (!user) return;

    const message: ChatMessage = {
      sender: user._id,
      senderName: user.username,
      text: msg || '', // אם אין טקסט, שולחים הודעה ריקה
      imageUrl: imageUrl || undefined, // אם יש תמונה, נוסיף אותה
    }; // לא שולחים sender, השרת יקבע אותו לפי ה-userId
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

  public sendPrivateMessage(toUserId: string, msg: string, imageUrl?: string): void {
    if (!this.socket) this.setup();

    const user = this.userService?.getLoggedInUser();
    this.errorLogger.log('user:', user);

    if (!user || !toUserId || (!msg.trim() && !imageUrl)) {
      console.warn('⚠️ Missing required data for private message:', { user, toUserId, msg, imageUrl });
      return;
    }

    const privateMessage: ChatMessage = {
      sender: user._id,
      senderName: user.username,
      text: msg || '', // אם אין טקסט, נשמור מחרוזת ריקה
      imageUrl: imageUrl || undefined, // נוסיף תמונה אם יש
      toUserId: toUserId
    };

    // שמירת ההודעה היוצאת בבאפר
    this.addToBuffer({
      ...privateMessage,
      senderName: 'Me'  // שמירה מקומית כ-'Me'
    });

    console.log('✅ Sending private message:', privateMessage);

    // ✅ שמירה על הלוגיקה הקיימת ושליחת הודעה עם תמונה אם קיימת
    this.socket?.emit(SOCKET_EMIT_SEND_PRIVATE_MSG, {
      toUserId: toUserId,
      text: msg, // עדיין שולח טקסט, גם אם ריק
      imageUrl: imageUrl, // הוספת שדה תמונה
      sender: user._id,
      senderName: user.username
    });
  }

  private addToBuffer(message: ChatMessage): void {
    if (!this.privateMessagesBuffer.some(existingMsg =>
      existingMsg.text === message.text &&
      existingMsg.sender === message.sender &&
      existingMsg.toUserId === message.toUserId
    )) {
      this.privateMessagesBuffer.push(message);
    }
  }

  // private keepSocketAlive(): void {
  //   if (!this.socket) return;

  //   setInterval(() => {
  //     console.log("🔄 שולח Keep-Alive ל-Socket...");
  //     this.socket?.emit("ping"); // שולח אירוע "ping" כדי לשמור על החיבור
  //   }, 4 * 60 * 1000); // שליחת ping כל 4 דקות
  // }
  // private keepSocketAlive(): void {
  //   if (!this.socket) return;

  //   // מניעת יצירת מספר אינטרוולים במקביל
  //   if (this.heartbeatInterval) {
  //     clearInterval(this.heartbeatInterval);
  //   }

  //   this.heartbeatInterval = setInterval(() => {
  //     console.log("🔄 שולח Keep-Alive ל-Socket...");
  //     this.socket?.emit("ping");
  //   }, 30 * 1000);
  // }


  private keepSocketAlive(): void {
    if (!this.socket) return;

    // מניעת יצירת אינטרוולים כפולים
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      console.log("🔄 שולח Keep-Alive ל-Socket...");
      this.socket?.emit("ping");
    }, 30000); // כל 30 שניות

    // שימוש ב-Web Worker כדי למנוע ניתוק גם כשהאפליקציה ברקע
    if (typeof Worker !== 'undefined') {
      if (this.heartbeatWorker) {
        this.heartbeatWorker.terminate();
      }
      this.heartbeatWorker = new Worker(new URL('./ping-worker.js', import.meta.url));
      this.heartbeatWorker.postMessage("start");

      this.heartbeatWorker.onmessage = (event) => {
        console.log("📩 Received message from worker:", event.data);

        if (event.data === "ping") {
          console.log("🔄 (Worker) שולח Keep-Alive ל-Socket...");
          this.socket?.emit("ping");
        } else if (event.data === "wake-up") {
          console.log("📲 מתעורר כל 30 שניות ...");
          this.setup(); // מחזיר את האפליקציה לפעולה
        }
      };
    } else {
      console.warn("⚠️ Web Worker לא נתמך בדפדפן זה.");
    }
  }





  public isConnected(): boolean {
    return this.socket?.connected ?? false;
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
    if (!this.socket) {
      this.errorLogger.log('Setting up socket for private messages');
      this.setup();
    }
    this.socket?.on(SOCKET_EVENT_ADD_PRIVATE_MSG, (msg: ChatMessage) => {
      this.errorLogger.log('Private message received', msg);
      console.log('📩 Private message received:', msg);

      // הוספת toUserId להודעה אם חסר
      const enhancedMsg = {
        ...msg,
        toUserId: msg.toUserId || this.userService.getLoggedInUser()?._id
      };

      if (!this.privateMessagesBuffer.some(existingMsg =>
        existingMsg.text === enhancedMsg.text && existingMsg.sender === enhancedMsg.sender)) {
        this.privateMessagesBuffer.push(enhancedMsg);
      }
      this.addToBuffer(enhancedMsg);
      callback(enhancedMsg);
    });
  }

  /**
   * מחזיר את כל ההודעות השמורות
   */
  public getPrivateMessages(): ChatMessage[] {
    this.errorLogger.log('Getting private messages', { count: this.privateMessagesBuffer.length });
    return [...this.privateMessagesBuffer];
  }

  /**
   * איפוס ההודעות הפרטיות (כשהן נטענות לממשק)
   */
  // public clearPrivateMessages(): void {
  //   this.privateMessagesBuffer = [];
  // }

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
  const developmentHosts = ['localhost', '192.168.1.63', '192.168.1.88', '10.0.2.2', '10.100.102.9'];
  const isProduction = !developmentHosts.includes(window.location.hostname);

  console.log(`Socket environment: ${environment}`);

  return isProduction
    ? 'https://backend-my-accounts.onrender.com'
    : `http://${window.location.hostname}:3030`;  // ישתמש באותו hostname כמו הפרונט
}

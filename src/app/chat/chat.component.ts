import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';
import { UserService } from '../services/user.service';
import { ChatMessage } from '../models/ChatMessage';
import { ErrorLoggerService } from '../services/Error-logger.service';
import { DeviceService } from '../services/device.service';
import { User } from '../models/user.model.ts';
import { NotificationService, PushNotificationData } from '../services/notification.service';
import { config } from '../services/config.service';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  isDevelopment = true;
  @Input() chatType: 'group' | 'private' = 'group';
  @Input() targetUserId: string = '';
  @ViewChild('roomInput') roomInput!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;
  notificationsEnabled = false;
  Notification = Notification;
  notificationPermission: string = 'default';



  room: string = ''; // חדר צ'אט
  newMessage: string = ''; // הודעה קבוצתית

  //targetUserId: string = ''; // מזהה משתמש להודעות פרטיות
  messages: ChatMessage[] = [];
  privateMessages: ChatMessage[] = [];
  private socketSubscription?: Subscription;
  private isPrivateMessageListenerActive = false; // דגל שמונע רישום כפול
  private userCache: { [key: string]: string } = {}; // מטמון לשמות משתמשים
  isRoomJoined: boolean = false;
  currentUser: any;
  isMobile: boolean = false;



  constructor(private socketService: SocketService, private userService: UserService,
    private errorLogger: ErrorLoggerService,
    private deviceService: DeviceService,
    private notificationService: NotificationService, // להוסיף
    private http: HttpClient

  ) {
    this.currentUser = this.userService.getLoggedInUser(), this.isMobile = this.deviceService.isMobile();
  }
  ngAfterViewInit() {
    if (this.chatType === 'group' && !this.isRoomJoined) {
      this.roomInput.nativeElement.focus();
    } else {
      this.chatInput.nativeElement.focus();
    }
  }

  showDebugInfo() {
    const logs = this.errorLogger.getLogs();
    const debugInfo = {
      currentUser: this.currentUser,
      chatType: this.chatType,
      targetUserId: this.targetUserId,
      messagesCount: this.privateMessages.length,
      logs: logs
    };
    alert(JSON.stringify(debugInfo, null, 2));
  }
  ngOnInit(): void {
    this.errorLogger.log('Chat component initialized', {
      chatType: this.chatType,
      targetUserId: this.targetUserId
    });
    this.socketSubscription = new Subscription();
    this.notificationPermission = Notification.permission;
    this.initializeNotifications();
    if (this.notificationPermission !== 'granted') {
      this.showNotificationPrompt();
    }

    if (this.chatType === 'group') {
      this.socketSubscription.add(
        this.socketService.on('chat-add-msg', (msg: ChatMessage) => {
          console.log('📩 New group message received:', msg);
          if (msg.sender === this.currentUser._id) {
            msg.senderName = 'Me';
          } else if (!msg.senderName) {
            // Try to get the username from cache or set a default
            msg.senderName = this.userCache[msg.sender] || 'User ' + msg.sender;
          }
          this.messages.push(msg);
        })
      );
    } else if (this.chatType === 'private') {
      this.loadPrivateMessages();
    }
  }
  showNotificationPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'notification-prompt';
    prompt.innerHTML = `
      <div class="notification-alert">
        האם תרצה לקבל התראות על הודעות חדשות?
        <div class="notification-actions">
          <button class="allow-btn">אפשר התראות</button>
          <button class="dismiss-btn">לא תודה</button>
        </div>
      </div>
    `;

    const allowBtn = prompt.querySelector('.allow-btn');
    const dismissBtn = prompt.querySelector('.dismiss-btn');

    allowBtn?.addEventListener('click', () => {
      this.requestNotificationPermission();
      prompt.remove();
    });

    dismissBtn?.addEventListener('click', () => {
      prompt.remove();
    });

    document.body.appendChild(prompt);
  }
  // בתוך ChatComponent
  async sendTestNotification() {
    console.log("🚀 sendTestNotification called");
    console.log("Starting test notification");
    try {
      const notificationData: PushNotificationData = {
        title: 'נוטיפיקציית בדיקה',
        body: 'זו נוטיפיקציה בדיקתית',
        icon: '/assets/notification-icon.png',
        data: {
          userId: this.currentUser._id
        }
      };
      console.log("📡 Sending notification request to server:", notificationData);
      await this.notificationService.sendNotification(notificationData);
      console.log('✅ נוטיפיקציה נשלחה בהצלחה', this.currentUser._id);
    } catch (error) {
      console.error('❌ שגיאה בשליחת נוטיפיקציה', error);
    }
  }

  private async initializeNotifications() {
    this.notificationsEnabled = this.notificationService.isPushEnabled();

    if (this.notificationsEnabled) {
      try {
        await this.notificationService.requestSubscription();
        this.errorLogger.log('Notification subscription successful');

        this.notificationService.getMessages().subscribe(message => {
          this.errorLogger.log('Push message received', message);
        });

        this.notificationService.getNotificationClicks().subscribe(click => {
          this.errorLogger.log('Notification clicked', click);
        });
      } catch (err) {
        this.errorLogger.log('Notification subscription failed', err);
      }
    }
  }
  async requestNotificationPermission() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      this.errorLogger.log('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/ngsw-worker.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(config.notifications.vapidPublicKey)
      });

      // שלח את ה-subscription לשרת
      await this.notificationService.requestSubscription();
      this.notificationsEnabled = true;
      this.errorLogger.log('Push notification subscription successful:', subscription);
    } catch (err) {
      this.errorLogger.log('Failed to request notification permission', err);
    }
  }

  // הוסף את פונקציית העזר להמרת המפתח
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  // In ChatComponent:
  // בקומפוננטה ChatComponent
  private loadPrivateMessages(): void {
    const savedMessages = this.socketService.getPrivateMessages();
    const currentUser = this.userService.getLoggedInUser() as User;

    console.log('Current user:', currentUser._id);
    console.log('Target user:', this.targetUserId);
    console.log('All messages:', savedMessages);

    this.privateMessages = savedMessages.filter(msg => {
      const isParticipant =
        (msg.sender === currentUser._id && msg.toUserId === this.targetUserId) ||
        (msg.sender === this.targetUserId && msg.toUserId === currentUser._id);

      console.log('Message:', msg);
      console.log('Is participant?', isParticipant);
      return isParticipant;
    }).map(msg => ({
      ...msg,
      senderName: msg.sender === currentUser._id ? 'Me' : (msg.senderName || 'User ' + msg.sender)
    }));

    // בדיקת הרשמה לאירועים חדשים
    if (!this.isPrivateMessageListenerActive) {
      this.socketService.onPrivateMessage(async (msg: ChatMessage) => {
        console.log('New message received:', msg);
        console.log('Preparing notification for message:', {
          sender: msg.sender,
          text: msg.text,
          currentUserId: this.currentUser._id
        });
        const isRelevant =
          (msg.sender === currentUser._id && msg.toUserId === this.targetUserId) ||
          (msg.sender === this.targetUserId && msg.toUserId === currentUser._id);

        console.log('Is message relevant?', isRelevant);

        if (isRelevant) {
          const formattedMessage = {
            ...msg,
            senderName: msg.sender === currentUser._id ? 'Me' : (msg.senderName || 'User ' + msg.sender)
          };
          this.privateMessages.push(formattedMessage);

          // חדש: טיפול בנוטיפיקציות להודעה נכנסת
          if (this.notificationsEnabled && msg.sender !== currentUser._id) {
            try {
              const notificationData: PushNotificationData = {  // שים לב לטיפוס החדש
                title: `הודעה חדשה מ-${formattedMessage.senderName}`,
                body: msg.text,
                icon: '/assets/chat-icon.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                data: {
                  senderId: msg.sender,
                  targetUserId: currentUser._id,
                  chatType: 'private'
                }
              };

              if (document.hidden) {
                await this.notificationService.sendNotification(notificationData);
              }
            } catch (err) {
              this.errorLogger.log('Error handling incoming message notification', err);
            }
          }
        }
      });
      this.isPrivateMessageListenerActive = true;
    }
  }

  async testPushNotification() {
    console.error('Starting testPushNotification');
    try {
      if (!('Notification' in window)) {
        this.errorLogger.log('דפדפן זה אינו תומך בהתראות');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.errorLogger.log('הרשאת התראות לא אושרה');
        return;
      }

      await this.notificationService.sendNotification({
        title: 'בדיקת מערכת',
        body: 'הנוטיפיקציות עובדות!',
        icon: '/assets/icon.png'
      });

      this.errorLogger.log('נוטיפיקציית בדיקה נשלחה בהצלחה');
    } catch (error) {
      this.errorLogger.log('שגיאה בשליחת נוטיפיקציה', error);
    }
  }


  joinRoom(): void {
    if (!this.room.trim()) return;
    this.socketService.emit('chat-set-topic', this.room);
    this.isRoomJoined = true;

    setTimeout(() => {
      this.chatInput.nativeElement.focus();
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;

    const message: ChatMessage = {
      sender: this.currentUser._id,
      senderName: 'Me',
      text: this.newMessage
    };

    this.socketService.emit('chat-send-msg', message);
    this.newMessage = '';
  }

  async sendPrivateMessage(): Promise<void> {
    this.errorLogger.log('Attempting to send private message', {
      to: this.targetUserId,
      text: this.newMessage
    });
    if (!this.targetUserId.trim() || !this.newMessage.trim()) return;

    const user = this.userService.getLoggedInUser();

    // הודעה מקומית לתצוגה מיידית
    const localMessage: ChatMessage = {
      sender: this.currentUser._id,
      senderName: 'Me',  // תמיד 'Me' עבור ההודעה המקומית
      text: this.newMessage,
      toUserId: this.targetUserId
    };

    // שליחה לשרת דרך השירות (שגם ישמור בבאפר)
    this.socketService.sendPrivateMessage(this.targetUserId, this.newMessage);

    // הוספה לתצוגה מקומית
    this.privateMessages.push(localMessage);
    this.newMessage = '';
    // בתוך sendPrivateMessage
    if (this.notificationsEnabled) {
      try {
        const notificationData: PushNotificationData = {  // שים לב לטיפוס החדש
          title: 'הודעה חדשה',
          body: this.newMessage,
          icon: '/assets/chat-icon.png',
          vibrate: [200, 100, 200],  // נוסיף רטט
          requireInteraction: true,   // הנוטיפיקציה תישאר עד שילחצו עליה
          data: {
            senderId: this.currentUser._id,
            targetUserId: this.targetUserId,
            chatType: 'private'
          }
        };

        if (document.hidden) {
          await this.notificationService.sendNotification(notificationData);
        }
      } catch (err) {
        this.errorLogger.log('Error handling notification', err);
      }
    }
  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }
}

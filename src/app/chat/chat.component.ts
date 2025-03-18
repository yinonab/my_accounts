import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef, inject, AfterViewInit, Output, EventEmitter } from '@angular/core';
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
import { FirebaseService } from '../services/firebase.service';
import { CloudinaryService } from '../services/cloudinary.service';



@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  isDevelopment = true;
  @Output() closeChat: EventEmitter<void> = new EventEmitter<void>();
  @Input() chatType: 'group' | 'private' = 'group';
  @Input() targetUserId: string = '';
  targetUsername: string = '';
  @ViewChild('roomInput') roomInput!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;
  notificationsEnabled = false;
  //Notification = Notification;
  notificationPermission: string = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  isUploading = false;  // מציין אם יש קובץ שנמצא בהעלאה
  uploadProgress = 0;   // מציין את אחוזי ההעלאה
  typingMessage: string = ''; // כאן תוצג האינדיקציה למה שהצד השני מקליד או שולח
  isTyping = false; // דגל כדי להפעיל ולהסתיר את ההודעה
  private typingDebounceTimer: any = null;
  selectedMedia: { url: string, type: 'image' | 'video' } | null = null;
  savedGroups: string[] = [];
  isSavedGroupsOpen = false;
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
  private firebaseService = inject(FirebaseService);
  private cloudinaryService = inject(CloudinaryService);
  private processedMessageIds: Set<string | number> = new Set();
  pendingMediaMessage: { mediaUrl: string; mediaType: 'image' | 'video'; text: string } | null = null;




  private typingTimeout: any = null;          // יעזור לנו לזהות מתי המשתמש הפסיק להקליד
  private TYPING_DELAY = 2000;
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
    setTimeout(() => this.scrollToBottom(), 100);
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
    this.loadSavedGroups();
    this.userService.getUserById(this.targetUserId)
      .subscribe({
        next: (user) => {
          console.log('Fetched target user:', user);
          this.targetUsername = user.username || 'Unknown';

          // כאן כבר יש לך את השם, אז עכשיו אפשר להדפיס
          this.errorLogger.log('Chat component initialized', {
            chatType: this.chatType,
            targetUserId: this.targetUserId,
            targetUsername: this.targetUsername
          });
        },
        error: (err) => {
          console.error('Failed to load target user by ID', err);
          this.targetUsername = 'Unknown';
        }
      });
    this.socketSubscription = new Subscription();
    this.notificationPermission = (typeof Notification !== 'undefined') ? Notification.permission : 'default';

    this.initializeNotifications();
    this.firebaseService.getFCMToken().then(token => {
      if (token) {
        console.log("🔑 FCM Token received:", token);
        this.notificationService.saveSubscription({ token });
      }
    });
    this.firebaseService.listenForMessages();
    if (this.notificationPermission !== 'granted') {
      this.showNotificationPrompt();
    }

    if (this.chatType === 'group') {
      this.socketSubscription.add(
        this.socketService.on('user-typing', (data: { fromUserId: string; messageType: string }) => {
          console.log(`✍️ Typing event received:`, data);

          if (data.fromUserId !== this.currentUser._id) {
            this.showTypingIndicator(data.messageType);
          }
        })
      );
      this.socketService.subscribeToChatAddMsg(async (msg: ChatMessage) => {
        // const messageId = msg.id || msg.tempId;
        // if (messageId && this.processedMessageIds.has(messageId)) {
        //   // הודעה זו כבר טופלה – מתעלמים ממנה
        //   return;
        // }
        // if (messageId) this.processedMessageIds.add(messageId);
        console.log('📩 התקבלה הודעה חדשה:', msg);
        console.log('🖼️ תמונה:', msg.imageUrl);
        console.log('🎥 וידאו:', msg.videoUrl); // ✅ נוסיף בדיקה לווידאו
        if (msg.sender === this.currentUser._id) {
          msg.senderName = 'Me';
        } else if (!msg.senderName) {
          // Try to get the username from cache or set a default
          msg.senderName = this.userCache[msg.sender] || 'User ' + msg.sender;
        }
        this.messages.push(msg);
        setTimeout(() => {
          requestAnimationFrame(() => this.scrollToBottom());
        }, 700);
        if (this.notificationsEnabled && msg.sender !== this.currentUser._id) {
          try {
            const notificationData: PushNotificationData = {
              title: `📢 הודעה חדשה בקבוצה`,
              body: msg.text ? msg.text : msg.imageUrl ? '📷 נשלחה תמונה פרטית' : msg.videoUrl ? '🎥 נשלח סרטון פרטי' : '📩 קיבלת הודעה פרטית',
              icon: msg.imageUrl ? msg.imageUrl : "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
              vibrate: [200, 100, 200],
              sound: 'default',
              requireInteraction: true,
              data: {
                senderId: msg.sender,
                chatType: 'group'
              }
            };
            await this.notificationService.sendNotification(notificationData);
            console.log('✅ נשלחה נוטיפיקציה על הודעה קבוצתית:', msg);
          } catch (err) {
            console.error('❌ שגיאה בשליחת נוטיפיקציה:', err);
          }
        }
      });
    } else if (this.chatType === 'private') {
      this.socketSubscription.add(
        this.socketService.on('user-typing', (data: { fromUserId: string; messageType: string }) => {
          console.log(`✍️ Typing event received:`, data);
          if (data.fromUserId !== this.currentUser._id) {
            this.showTypingIndicator(data.messageType);
          }
        })
      );
      this.loadPrivateMessages();
    }

    this.socketSubscription.add(
      this.socketService.on('user-stop-typing', (data: { fromUserId: string }) => {
        console.log(`🛑 stop-typing event received:`, data);
        if (data.fromUserId !== this.currentUser?._id) {
          this.isTyping = false;
        }
      })
    );
  }
  showTypingIndicator(type: string): void {
    this.isTyping = true;

    if (type === 'text') {
      this.typingMessage = 'Typing...';
    } else if (type === 'image') {
      this.typingMessage = '📷 Sending an image...';
    } else if (type === 'video') {
      this.typingMessage = '🎥 Sending a video...';
    } else {
      this.typingMessage = 'Typing...';
    }

    // אפשר להשאיר טיימר של 3 שניות, או להשתמש באירוע stop-typing
    // כאן נשאיר כגיבוי (אם לא מגיע stop-typing):
    // setTimeout(() => {
    //   this.isTyping = false;
    // }, 3000);
  }
  onTyping(): void {
    if (!this.targetUserId) return;

    clearTimeout(this.typingDebounceTimer);
    this.typingDebounceTimer = setTimeout(() => {
      // אחרי 300ms ללא הקשה נוספת, שולחים typing
      this.socketService.emit('typing', {
        toUserId: this.targetUserId,
        messageType: 'text'
      });
    }, 5);



    // מנגנון "אם לא הקלדת יותר מ-2 שניות, שלח stop-typing"
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.onStopTyping();
    }, this.TYPING_DELAY);
  }
  onStopTyping(): void {
    if (!this.targetUserId) return;
    this.socketService.emit('stop-typing', {
      toUserId: this.targetUserId
    });
  }
  showNotificationPrompt() {
    // [RED] בדיקה אם Notification קיים – אם לא, לא נמשיך
    if (typeof Notification === 'undefined') {
      console.warn("Notification API is not available in this environment.");
      return;
    }
    
    if (document.querySelector('.notification-prompt')) return; // מניעת כפילויות
  
    const prompt = document.createElement('div');
    prompt.className = 'notification-prompt';
    prompt.innerHTML = `
      <div class="notification-alert">
        האם תרצה לקבל התראות על הודעות חדשות?
        <div class="notification-actions">
          <button id="allow-btn">אפשר התראות</button>
          <button id="dismiss-btn">לא תודה</button>
        </div>
      </div>
    `;
  
    document.body.appendChild(prompt);
  
    document.getElementById('allow-btn')?.addEventListener('click', async () => {
      console.log("🟢 לחיצה על 'אפשר התראות'");
      // [RED] עטיפה בבדיקה לוודא ש־Notification קיים
      if (typeof Notification !== 'undefined') {
        const permission = await Notification.requestPermission();
        console.log("🔔 הרשאת נוטיפיקציות התקבלה:", permission);
        if (permission === 'granted') {
          await this.requestNotificationPermission();
          console.log('✅ ההרשאה אושרה והוגדרה');
        } else {
          console.warn('❌ המשתמש לא אישר התראות');
        }
      } else {
        console.warn("Notification API is not available in this environment.");
      }
      prompt.remove();
    });
  
    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      console.log('🔕 המשתמש דחה את הבקשה');
      prompt.remove();
    });
  }
  
  private scrollToBottom(): void {
    setTimeout(() => {
        requestAnimationFrame(() => {
            if (this.messagesContainer?.nativeElement) {
                this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
            }
        });
    }, 100);
}





  // בתוך ChatComponent
  async sendTestNotification() {
    console.log("🚀 sendTestNotification called");
    console.log("Starting test notification");
    try {
      const notificationData: PushNotificationData = {
        title: 'נוטיפיקציית בדיקה',
        body: 'זו נוטיפיקציה בדיקתית',
        icon: "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
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
    console.log('🟢 loadPrivateMessages() is being called');

    const savedMessages = this.socketService.getPrivateMessages();
    const currentUser = this.userService.getLoggedInUser() as User;
    this.scrollToBottom();

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
          imageUrl: msg.imageUrl,
          videoUrl: msg.videoUrl,
          currentUserId: this.currentUser._id
        });
        const isRelevant =
          (msg.sender === currentUser._id && msg.toUserId === this.targetUserId) ||
          (msg.sender === this.targetUserId && msg.toUserId === currentUser._id);

        console.log('Is message relevant?', isRelevant);

        if (isRelevant) {
          console.log('New message received:', msg);
          const formattedMessage = {
            ...msg,
            senderName: msg.sender === currentUser._id ? 'Me' : (msg.senderName || 'User ' + msg.sender)
          };
          const existingIndex = this.privateMessages.findIndex(m =>
            m.tempId !== undefined && formattedMessage.tempId !== undefined && m.tempId === formattedMessage.tempId
          );
          if (existingIndex !== -1) {
            // עדכון ההודעה הקיימת
            this.privateMessages[existingIndex] = { ...this.privateMessages[existingIndex], ...formattedMessage };
          } else {
            // הוספת הודעה חדשה
            this.privateMessages.push(formattedMessage);
          }
          setTimeout(() => {
            requestAnimationFrame(() => this.scrollToBottom());
          }, 700);

          // חדש: טיפול בנוטיפיקציות להודעה נכנסת
          if (this.notificationsEnabled && msg.sender !== currentUser._id) {
            try {
              const notificationData: PushNotificationData = {  // שים לב לטיפוס החדש
                title: `🚨 הודעה חדשה מ- ${formattedMessage.senderName}`,
                body: msg.text ? msg.text : msg.imageUrl ? '📷 נשלחה תמונה פרטית' : msg.videoUrl ? '🎥 נשלח סרטון פרטי' : '📩 קיבלת הודעה פרטית',
                icon: msg.imageUrl ? msg.imageUrl : "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
                vibrate: [200, 100, 200],
                sound: 'default',
                requireInteraction: true,
                data: {
                  senderId: msg.sender,
                  targetUserId: currentUser._id,
                  chatType: 'private'
                }
              };

              // if (document.hidden) {
              await this.notificationService.sendNotification(notificationData);
              // }
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
        icon: "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png"
      });

      this.errorLogger.log('נוטיפיקציית בדיקה נשלחה בהצלחה');
    } catch (error) {
      this.errorLogger.log('שגיאה בשליחת נוטיפיקציה', error);
    }
  }
  joinSavedGroup(group: string): void {
    this.room = group;
    this.joinRoom();
    this.isSavedGroupsOpen = false;
  }
  toggleSavedGroups(): void {
    this.isSavedGroupsOpen = !this.isSavedGroupsOpen;
  }
  // פונקציה להסרת חדר מהרשימה
  removeGroup(group: string): void {
    this.savedGroups = this.savedGroups.filter(g => g !== group);
    localStorage.setItem('savedGroups', JSON.stringify(this.savedGroups));
  }
  loadSavedGroups(): void {
    const saved = localStorage.getItem('savedGroups');
    if (saved) {
      this.savedGroups = JSON.parse(saved);
    }
  }
  joinRoom(): void {
    if (!this.room.trim()) return;

    if (!this.savedGroups.includes(this.room)) {
      this.savedGroups.push(this.room);
      localStorage.setItem('savedGroups', JSON.stringify(this.savedGroups));
    }

    this.socketService.emit('chat-set-topic', this.room);
    this.isRoomJoined = true;

    setTimeout(() => {
      this.chatInput.nativeElement.focus();
    });
  }
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      console.log(`📂 File selected: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (isVideo || isImage) {
        if (this.chatType === 'private' && this.targetUserId) {
          this.socketService.emit('typing', {
            toUserId: this.targetUserId,
            messageType: isVideo ? 'video' : 'image'
          });
        } else if (this.chatType === 'group') {
          // ייתכן שתצטרך להעביר גם מידע room, תלוי בהגדרות הצד שרת
          this.socketService.emit('typing', {
            messageType: isVideo ? 'video' : 'image'
          });
        }
      }

      this.isUploading = true;  // מציגים את הלואדר
      this.uploadProgress = 5; // מתחילים מ-10%

      // 🔹 אינטרוול יחיד שמעלה בהדרגה את האחוזים עד 100
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 100) {
          this.uploadProgress += 1; // קצב ההתקדמות
        }
      }, 100);
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (fileUrl) => {
          console.log(`✅ File uploaded successfully! URL: ${fileUrl}`);
          clearInterval(progressInterval); // מסירים את האינטרוול

          // מבטיחים שה-progress מגיע ל-100% לפני הסרת הלואדר
          this.uploadProgress = 100;
          setTimeout(() => {
            this.isUploading = false; // ❌ מסירים את הלואדר
          }, 10);

          // במקום לשלוח מיד, נשמור את הודעת המדיה במשתנה pendingMediaMessage
          this.pendingMediaMessage = {
            mediaUrl: fileUrl,
            mediaType: isVideo ? 'video' : 'image',
            text: ''  // שדה הטקסט ההתחלתי ריק
          };


          // if (this.chatType === 'private') {
          //   // 🔹 הודעה פרטית
          //   if (file.type.startsWith('image/')) {
          //     this.sendPrivateImageMessage(fileUrl);
          //   } else if (file.type.startsWith('video/')) {
          //     this.sendPrivateVideoMessage(fileUrl);
          //   }
          // } else {
          //   // 🔹 הודעה קבוצתית
          //   if (file.type.startsWith('image/')) {
          //     this.sendImageMessage(fileUrl);
          //   } else if (file.type.startsWith('video/')) {
          //     this.sendVideoMessage(fileUrl);
          //   }
          // }
        },
        error: (err) => {
          console.error(`❌ Error uploading file: ${err.message}`, err);
          this.isUploading = false;  // ביטול טעינה במקרה של שגיאה

        },
      });
    } else {
      console.warn(`⚠️ No file selected or file input is empty.`);
    }
  }
  triggerCloseChat(): void {
    this.closeChat.emit();
  }

  sendPendingMediaMessage(): void {
    if (!this.pendingMediaMessage) return;

    const message: ChatMessage = {
      tempId: Date.now(),
      sender: this.currentUser._id,
      senderName: 'Me',
      text: this.pendingMediaMessage.text,
      // בהתאם לסוג המדיה נבחר את השדה המתאים:
      imageUrl: this.pendingMediaMessage.mediaType === 'image' ? this.pendingMediaMessage.mediaUrl : '',
      videoUrl: this.pendingMediaMessage.mediaType === 'video' ? this.pendingMediaMessage.mediaUrl : ''
    };

    if (this.chatType === 'private') {
      this.socketService.sendPrivateMessage(this.targetUserId, message.text, message.tempId || undefined, message.imageUrl, message.videoUrl);
      this.privateMessages.push(message);
    } else {
      this.socketService.sendMessage(message.text, message.imageUrl, message.videoUrl);
      //this.messages.push(message);
    }

    // ניקוי הודעת המדיה הממתינה
    this.pendingMediaMessage = null;
    // this.scrollToBottom();
    setTimeout(() => this.scrollToBottom(), 100);
    this.onStopTyping();
  }

  cancelPendingMediaMessage(): void {
    this.pendingMediaMessage = null;
  }


  sendVideoMessage(videoUrl: string): void {
    console.log(`🎬 Preparing to send video message: ${videoUrl}`);

    const message: ChatMessage = {
      sender: this.currentUser._id,
      senderName: 'Me',
      imageUrl: '',
      videoUrl: videoUrl,
      text: '' // אין טקסט כי זה וידאו בלבד
    };

    console.log(`📡 Emitting video message via socket...`, message);
    this.socketService.sendMessage('', '', videoUrl);

    console.log(`💾 Adding video message to messages array...`);
    //this.messages.push(message);

    console.log(`📜 Scrolling to bottom after sending video...`);
    setTimeout(() => {
      requestAnimationFrame(() => this.scrollToBottom());
    }, 1250);
    this.onStopTyping();
  }

  handleImageError(imageUrl: string) {
    console.error('❌ שגיאה בטעינת תמונה:', imageUrl);
  }

  handleVideoError(videoUrl: string) {
    console.error('❌ שגיאה בטעינת וידאו:', videoUrl);
  }




  sendImageMessage(imageUrl: string): void {
    console.log(`🚀 Preparing to send group image message: ${imageUrl}`);

    const message: ChatMessage = {
      sender: this.currentUser._id,
      senderName: 'Me',
      imageUrl: imageUrl,
      text: '' // הודעה ריקה כי זו רק תמונה
    };

    console.log(`📡 Emitting group image message via socket...`, message);
    this.socketService.sendMessage('', imageUrl); // שימוש נכון בפונקציה המעודכנת

    console.log(`💾 Adding image message to messages array...`);
    //this.messages.push(message);

    console.log(`📜 Scrolling to bottom after sending image...`);
    setTimeout(() => {
      requestAnimationFrame(() => this.scrollToBottom());
    }, 700);
    this.onStopTyping();
  }

  sendPrivateImageMessage(imageUrl: string, videoUrl?: string): void {
    console.log(`📩 Preparing to send private image message to user ${this.targetUserId}: ${imageUrl}`);

    const privateMessage: ChatMessage = {
      tempId: Date.now(),
      sender: this.currentUser._id,
      senderName: 'Me',
      imageUrl: imageUrl,
      //videoUrl: videoUrl,
      toUserId: this.targetUserId,
      text: '' // הודעה ריקה כי זו רק תמונה
    };

    console.log(`📡 Emitting private image message via socket...`, privateMessage);
    this.socketService.sendPrivateMessage(this.targetUserId, '', privateMessage.tempId, imageUrl, undefined); // שימוש נכון בפונקציה

    console.log(`💾 Adding private image message to privateMessages array...`);
    this.privateMessages.push(privateMessage);

    console.log(`📜 Scrolling to bottom after sending private image...`);
    setTimeout(() => {
      requestAnimationFrame(() => this.scrollToBottom());
    }, 700);
    this.onStopTyping();
  }
  sendPrivateVideoMessage(videoUrl: string): void {
    console.log(`🎬 Sending private video message to ${this.targetUserId}: ${videoUrl}`);

    const privateMessage: ChatMessage = {
      tempId: Date.now(),
      sender: this.currentUser._id,
      senderName: 'Me',
      videoUrl: videoUrl,
      toUserId: this.targetUserId,
      text: '' // אין טקסט כי זה וידאו בלבד
    };

    console.log(`📡 Emitting private video message via socket...`, privateMessage);
    this.socketService.sendPrivateMessage(this.targetUserId, '', privateMessage.tempId, undefined, videoUrl);

    console.log(`💾 Adding private video message to privateMessages array...`);
    this.privateMessages.push(privateMessage);

    setTimeout(() => {
      requestAnimationFrame(() => this.scrollToBottom());
    }, 1250);
    this.onStopTyping();
  }



  sendMessage(event?: Event): void {
    if (event) {
      event.preventDefault(); // מונע איבוד פוקוס בלחיצה על הכפתור
    }

    if (!this.newMessage.trim()) return;

    const message: ChatMessage = {
      sender: this.currentUser._id,
      senderName: 'Me',
      text: this.newMessage
    };

    this.socketService.emit('chat-send-msg', message);
    //this.messages.push(message);
    this.scrollToBottom();

    // שמירת פוקוס בלי לאפס מידית את השדה
    const inputElement = this.chatInput?.nativeElement;
    inputElement.blur(); // מוריד פוקוס
    this.newMessage = ''; // איפוס ההודעה
    setTimeout(() => {
      inputElement.focus(); // החזרת פוקוס אחרי 100ms
    }, 10);
    this.onStopTyping();
  }



  async sendPrivateMessage(event?: Event): Promise<void> {
    if (event) {
      event.preventDefault(); // מונע איבוד פוקוס בלחיצה על הכפתור
    }

    this.errorLogger.log('Attempting to send private message', {
      to: this.targetUserId,
      text: this.newMessage
    });

    if (!this.targetUserId.trim() || !this.newMessage.trim()) return;

    const localMessage: ChatMessage = {
      tempId: Date.now(),
      sender: this.currentUser._id,
      senderName: 'Me',
      text: this.newMessage,
      toUserId: this.targetUserId
    };

    // שליחת ההודעה לשרת
    this.socketService.sendPrivateMessage(this.targetUserId, this.newMessage, localMessage.tempId, undefined, undefined,);
    this.privateMessages.push(localMessage);
    // this.scrollToBottom();
    setTimeout(() => this.scrollToBottom(), 100);

    this.onStopTyping();

    // איפוס ומיקוד מחדש לשמירת המקלדת פתוחה
    // שמירת פוקוס בלי לאפס מידית את השדה
    const inputElement = this.chatInput?.nativeElement;
    inputElement.blur(); // מוריד פוקוס
    this.newMessage = ''; // איפוס ההודעה
    setTimeout(() => {
      inputElement.focus(); // החזרת פוקוס אחרי 100ms
    }, 10);
    console.log("Message content:", this.newMessage);

    if (this.notificationsEnabled) {
      try {
        const notificationData: PushNotificationData = {
          title: 'הודעה חדשה',
          body: localMessage.text, // שימוש בהודעה שנשלחה במקום this.newMessage (שכבר אופסה)
          icon: "https://res.cloudinary.com/dzqnyehxn/image/upload/v1739858070/belll_fes617.png",
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: {
            senderId: this.currentUser._id,
            targetUserId: this.targetUserId,
            chatType: 'private'
          }
        };

        await this.notificationService.sendNotification(notificationData);
      } catch (err) {
        this.errorLogger.log('Error handling notification', err);
      }
    }
  }
  openMediaModal(url: string, type: 'image' | 'video'): void {
    this.selectedMedia = { url, type };
  }

  closeMediaModal(): void {
    this.selectedMedia = null;
  }
  


  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }
}

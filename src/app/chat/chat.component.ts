import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';
import { UserService } from '../services/user.service';
import { ChatMessage } from '../models/ChatMessage';
import { ErrorLoggerService } from '../services/Error-logger.service';
import { DeviceService } from '../services/device.service';
import { User } from '../models/user.model.ts';

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
    private deviceService: DeviceService
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
      this.socketService.onPrivateMessage((msg: ChatMessage) => {
        console.log('New message received:', msg);

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
        }
      });
      this.isPrivateMessageListenerActive = true;
    }
  }
  openChat() {
    // טעינת ההודעות מהבאפר בלי למחוק אותן
    const savedMessages = this.socketService.getPrivateMessages();

    // מיפוי ההודעות עם השמות הנכונים
    this.privateMessages = savedMessages.map(msg => ({
      ...msg,
      senderName: msg.sender === this.currentUser._id ? 'Me' : (msg.senderName || 'User ' + msg.sender)
    }));

    // לא מוחקים יותר את ההודעות מהבאפר
    // this.socketService.clearPrivateMessages(); // הסרנו את השורה הזו
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

  sendPrivateMessage(): void {
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
  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }
}

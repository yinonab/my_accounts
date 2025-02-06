import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';
import { UserService } from '../services/user.service';
import { ChatMessage } from '../models/ChatMessage';
import { ErrorLoggerService } from '../services/Error-logger.service';
import { DeviceService } from '../services/device.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  isDevelopment = true;
  @Input() chatType: 'group' | 'private' = 'group';
  @Input() targetUserId: string = '';

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
  private loadPrivateMessages(): void {
    const savedMessages = this.socketService.getPrivateMessages();
    const user = this.userService.getLoggedInUser();

    this.privateMessages = savedMessages.map(msg => {
      const isCurrentUser = msg.sender === this.currentUser._id;
      const messageWithName: ChatMessage = {
        ...msg,
        senderName: isCurrentUser ? 'Me' : (msg.senderName || 'User ' + msg.sender)
      };
      return messageWithName;
    });

    if (!this.isPrivateMessageListenerActive) {
      this.socketSubscription?.add(
        this.socketService.onPrivateMessage((msg: ChatMessage) => {
          console.log('📩 New private message received:', msg);
          const isCurrentUser = msg.sender === this.currentUser._id;

          const formattedMessage: ChatMessage = {
            ...msg,
            senderName: isCurrentUser ? 'Me' : (msg.senderName || 'User ' + msg.sender)
          };

          // לוג לבדיקה
          console.log('Message sender:', msg.sender);
          console.log('Current user:', this.currentUser._id);
          console.log('Is current user?', isCurrentUser);

          if (!this.privateMessages.some(existingMsg =>
            existingMsg.text === formattedMessage.text &&
            existingMsg.sender === formattedMessage.sender)) {
            this.privateMessages.push(formattedMessage);
          }
        })
      );
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
    console.log(`🔹 Joined room: ${this.room}`);
    this.isRoomJoined = true;
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

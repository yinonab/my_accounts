import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';
import { UserService } from '../services/user.service';
import { ChatMessage } from '../models/ChatMessage';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
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


  constructor(private socketService: SocketService, private userService: UserService) { this.currentUser = this.userService.getLoggedInUser(); }

  ngOnInit(): void {
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
    this.privateMessages = this.socketService.getPrivateMessages();
    this.socketService.clearPrivateMessages(); // מחיקת ההודעות מהסרוויס לאחר שהן נטענו
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
    if (!this.targetUserId.trim() || !this.newMessage.trim()) return;

    const user = this.userService.getLoggedInUser();

    // הודעה מקומית לתצוגה מיידית
    const localMessage: ChatMessage = {
      sender: this.currentUser._id,
      senderName: 'Me',  // תמיד 'Me' עבור ההודעה המקומית
      text: this.newMessage,
      toUserId: this.targetUserId
    };

    // שליחה לשרת
    this.socketService.emit('chat-send-private-msg', {
      toUserId: this.targetUserId,
      text: this.newMessage,
      sender: this.currentUser._id,
      senderName: user?.username
    });

    this.privateMessages.push(localMessage);
    this.newMessage = '';
  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }
}

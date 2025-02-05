import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() chatType: 'group' | 'private' = 'group';
  room: string = ''; // חדר צ'אט
  newMessage: string = ''; // הודעה קבוצתית
  targetUserId: string = ''; // מזהה משתמש להודעות פרטיות
  messages: { sender: string; text: string }[] = []; // הודעות קבוצתיות
  privateMessages: { sender: string; text: string }[] = []; // הודעות פרטיות
  private socketSubscription?: Subscription;
  private isPrivateMessageListenerActive = false; // דגל שמונע רישום כפול
  private userCache: { [key: string]: string } = {}; // מטמון לשמות משתמשים


  constructor(private socketService: SocketService, private userService: UserService) { }

  ngOnInit(): void {
    this.socketSubscription = new Subscription();

    if (this.chatType === 'group') {
      this.socketSubscription.add(
        this.socketService.on('chat-add-msg', (msg: any) => {
          console.log('📩 New group message received:', msg);
          this.messages.push(msg);
        })
      );
    } else if (this.chatType === 'private') {
      this.loadPrivateMessages(); // טעינת הודעות פרטיות ששמורות ב- SocketService
    }
  }
  private loadPrivateMessages(): void {
    this.privateMessages = this.socketService.getPrivateMessages();

    if (!this.isPrivateMessageListenerActive) {
      this.socketSubscription?.add(
        this.socketService.onPrivateMessage((msg: any) => {
          console.log('📩 New private message received:', msg);

          // מניעת כפילות – נוסיף את ההודעה רק אם היא לא קיימת
          if (!this.privateMessages.some(existingMsg => existingMsg.text === msg.text && existingMsg.sender === msg.sender)) {
            this.privateMessages.push(msg);
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
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;

    const message = { sender: 'Me', text: this.newMessage };
    this.socketService.emit('chat-send-msg', message);

    // אין צורך להוסיף את ההודעה כאן, ההודעה תגיע מהשרת
    this.newMessage = ''; // ניקוי השדה
  }

  sendPrivateMessage(): void {
    if (!this.targetUserId.trim() || !this.newMessage.trim()) {
      console.warn(`⚠️ Missing recipient or message: { toUserId: ${this.targetUserId}, message: ${this.newMessage} }`);
      return;
    }

    const privateMessage = { sender: 'Me', text: this.newMessage, toUserId: this.targetUserId }; // שינוי שם המשתנה

    console.log(`📩 Sending private message:`, privateMessage);
    this.socketService.emit('chat-send-private-msg', privateMessage);
    this.privateMessages.push(privateMessage);

    this.newMessage = ''; // ניקוי השדה
  }



  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }
}

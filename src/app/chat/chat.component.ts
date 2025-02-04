import { Component, OnInit, OnDestroy } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  room: string = ''; // חדר צ'אט
  newMessage: string = ''; // הודעה קבוצתית
  targetUserId: string = ''; // מזהה משתמש להודעות פרטיות
  messages: { sender: string; text: string }[] = []; // הודעות קבוצתיות
  privateMessages: { sender: string; text: string }[] = []; // הודעות פרטיות
  private socketSubscription?: Subscription;

  constructor(private socketService: SocketService, private userService: UserService) { }

  ngOnInit(): void {
    this.socketSubscription = new Subscription();

    this.socketSubscription.add(
      this.socketService.on('chat-add-msg', (msg: any) => {
        console.log('📩 New group message received:', msg);

        const loggedInUser = this.userService.getLoggedInUser();

        if (loggedInUser && msg.sender === loggedInUser._id) {
          msg.sender = 'Me';
          this.messages.push(msg);
        } else {
          this.userService.getUserById(msg.sender).subscribe(user => {
            msg.sender = user?.username || msg.sender; // fallback ל-userId אם אין שם
            this.messages.push(msg); // מוסיפים רק לאחר שקיבלנו את השם הנכון
          });
        }
      })
    );
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
    if (!this.targetUserId.trim() || !this.newMessage.trim()) return;

    const privateMessage = { sender: 'Me', text: this.newMessage, to: this.targetUserId };
    this.socketService.emit('chat-send-private-msg', privateMessage);

    // אין צורך להוסיף את ההודעה כאן, ההודעה תגיע מהשרת
    this.newMessage = ''; // ניקוי השדה
  }


  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }
}

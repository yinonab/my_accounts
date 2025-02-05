import { Component, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { User } from '../../../models/user.model.ts';
import { UserService } from '../../../services/user.service';
import { SocketService } from '../../../services/socket.service.js';

@Component({
  selector: 'user-index',
  templateUrl: './user-index.component.html',
  styleUrls: ['./user-index.component.scss']
})
export class UserIndexComponent {
  userService = inject(UserService);
  socketService = inject(SocketService);
  users$!: Observable<User[]>;
  destroyRef = inject(DestroyRef);
  isGroupChatOpen = false;
  isPrivateChatOpen = false;
  unreadPrivateMessagesCount = 0;

  ngOnInit(): void {
    this.loadUsers(); // טעינת המשתמשים הראשונית

    // מאזין להודעות פרטיות
    this.socketService.onPrivateMessage((msg: any) => {
      console.log('📩 New private message received:', msg);

      if (!this.isPrivateChatOpen) {
        this.unreadPrivateMessagesCount++;
        this.showNotification('New Private Message', msg.text);
      }
    });
  }

  /**
   * טוען את כל המשתמשים מהשרת
   */
  private loadUsers(): void {
    this.userService.loadUsers().subscribe({
      error: err => console.error('Failed to load users:', err),
    });

    // מאזין לרשימת המשתמשים
    this.users$ = this.userService.users$.pipe(
      takeUntilDestroyed(this.destroyRef)
    );
  }
  openChat(type: 'group' | 'private') {
    if (type === 'group') {
      this.isGroupChatOpen = true;
    } else if (type === 'private') {
      this.isPrivateChatOpen = true;
      this.unreadPrivateMessagesCount = 0;

      // קריאה ל- openChat בצ'אט עצמו כדי לטעון את ההודעות שנשמרו
      setTimeout(() => {
        const chatComponent = document.querySelector('app-chat') as any;
        if (chatComponent && chatComponent.openChat) {
          chatComponent.openChat();
        }
      }, 0);
    }
  }

  closeChat(type: 'group' | 'private') {
    if (type === 'group') {
      this.isGroupChatOpen = false;
    } else if (type === 'private') {
      this.isPrivateChatOpen = false;
    }
  }

  /**
   * התראה קופצת למשתמש
   */
  showNotification(title: string, body: string): void {
    if (!('Notification' in window)) return;

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }


  /**
   * מחיקת משתמש
   */
  onRemoveUser(userId: string): void {
    this.userService.deleteUser(userId).subscribe({
      next: () => this.loadUsers(), // טוען מחדש לאחר מחיקה
      error: err => console.error('Failed to delete user:', err),
    });
  }
}

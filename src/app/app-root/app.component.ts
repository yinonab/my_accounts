import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { ContactService } from '../services/contact.service';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'MyAccounts';
  private contactService = inject(ContactService)
  private firebaseService = inject(FirebaseService);
  subscription!: Subscription

  ngOnInit(): void {
    this.subscription = this.contactService.loadContacts()
      .pipe(take(1))
      .subscribe({
        error: err => console.log('err:', err)
      })
    console.log("🚀 AppComponent Initialized");

    this.firebaseService.getFCMToken().then(token => {
      if (token) {
        console.log("🔑 FCM Token received (on init):", token);
      }
    });

    // הפעלת שירות Firebase
    this.firebaseService.getTokenObservable().subscribe(token => {
      if (token) {
        console.log("🔑 FCM Token received:", token);
        // כאן תוכל לשלוח את ה-token לשרת אם צריך
      }
    });
  }



  ngOnDestroy(): void {
    this.subscription?.unsubscribe?.()
  }
}

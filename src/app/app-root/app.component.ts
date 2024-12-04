import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { ContactService } from '../services/contact.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'misterBITcoin';
  private contactService = inject(ContactService)
  subscription!: Subscription

  ngOnInit(): void {
      this.subscription = this.contactService.loadContacts()
          .pipe(take(1))
          .subscribe({
              error:err => console.log('err:', err)
          })
  }


  ngOnDestroy(): void {
      this.subscription?.unsubscribe?.()
  }
}

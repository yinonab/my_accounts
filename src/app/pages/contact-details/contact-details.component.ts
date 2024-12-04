import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Contact } from '../../models/contact.model';

@Component({
  selector: 'contact-details',
  templateUrl: './contact-details.component.html',
  styleUrl: './contact-details.component.scss'
})
export class ContactDetailsComponent implements OnInit, OnDestroy {

  private router = inject(Router)
  private route = inject(ActivatedRoute)

  subscription!: Subscription

  contact$!: Contact

  async ngOnInit(): Promise<void> {
    this.subscription = this.route.data
    .pipe(map(data => data['contact']))
    .subscribe(contact => this.contact$ = contact)
  }

  onBack() {
    this.router.navigateByUrl('/contact')
  
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }
}

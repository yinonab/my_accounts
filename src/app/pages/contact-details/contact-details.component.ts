import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subscription, map } from 'rxjs';
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

  contact$!: Observable<Contact>;

  ngOnInit(): void {
    this.contact$ = this.route.data.pipe(
      map(data => {
        const contact = data['contact'];
        if (contact) {
          // Normalize the keys
          return {
            ...contact,
            lastName: contact.lastName,
            birthday: contact.birth,
          };
        }
        return contact;
      })
    );
  }



  onBack(): void {
    this.router.navigate([{ outlets: { modal: null } }]); // Clear the 'modal' outlet
  }


  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }
  isLongField(value: string | null | undefined, maxLength: number): boolean {
    return value ? value.length > maxLength : false;
  }

}

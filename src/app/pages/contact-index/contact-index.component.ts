import { Component, inject,DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Contact } from '../../models/contact.model';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'contact-index',
  templateUrl: './contact-index.component.html',
  styleUrl: './contact-index.component.scss'
})
export class ContactIndexComponent {
onRemoveContact(contactId:string) {
  this.contactService.deleteContact(contactId)
  .subscribe({
    error:err=>console.log('err',err)
  })
}    
  contactService = inject(ContactService)
  contacts$!: Observable<Contact[]>
  destroyRef=inject(DestroyRef)


  ngOnInit(): void {
      this.contacts$ = this.contactService.contacts$
      .pipe(takeUntilDestroyed(this.destroyRef)) 
           
  }
}

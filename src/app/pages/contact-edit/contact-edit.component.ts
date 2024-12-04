import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ContactService } from '../../services/contact.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, filter, map, takeUntil } from 'rxjs';
import { Contact } from '../../models/contact.model';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'contact-edit',
  templateUrl: './contact-edit.component.html',
  styleUrl: './contact-edit.component.scss'
})
export class ContactEditComponent implements OnInit, OnDestroy {

  form!: FormGroup
  constructor(private fb: FormBuilder) { }

  contactService = inject(ContactService)
  contact = this.contactService.getEmptyContact()
  private router = inject(Router)
  private route = inject(ActivatedRoute)


  destroySubject$ = new Subject<void>()

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.contact.name, [Validators.required]],
      phone: [this.contact.phone, [Validators.required]],
      email: [this.contact.email, [Validators.required]]
    })

    this.route.data
      .pipe(
        map(data => data['contact']),
        filter(contact => !!contact)
      )
      .subscribe(contact => {
        this.contact = contact
        this.form = this.fb.group({
          name: this.contact.name,
          phone: this.contact.phone,
          email: this.contact.email,
          _id: this.contact._id
        })
      }
      )
  }

  onDeleteContact(contactId: string) {
    this.contactService.deleteContact(contactId)
      .pipe(takeUntil(this.destroySubject$),)
      .subscribe({
        next: this.onBack,
        error: err => console.log('err:', err)
      })
  }

  onSaveContact() {
    this.contactService.saveContact(this.form.value as Contact)
      .pipe(takeUntil(this.destroySubject$),)
      .subscribe({
        next: this.onBack,
        error: err => console.log('err:', err)
      })
  }

  onBack = () => {
    this.router.navigateByUrl('/contact')
  }

  ngOnDestroy(): void {
    this.destroySubject$.next()
  }
}

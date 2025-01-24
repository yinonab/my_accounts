import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ContactService } from '../../services/contact.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subject, filter, map, takeUntil } from 'rxjs';
import { Contact } from '../../models/contact.model';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { nonEnglishLetters } from '../../Validators/validators';
import { MsgService } from '../../services/msg.service';


@Component({
  selector: 'contact-edit',
  templateUrl: './contact-edit.component.html',
  styleUrl: './contact-edit.component.scss',
  providers: [DatePipe]
})
export class ContactEditComponent implements OnInit, OnDestroy {

  IsLastName: boolean = false
  form!: FormGroup
  showDeleteModal: boolean = false; // State for controlling modal visibility
  constructor(private fb: FormBuilder, private datePipe: DatePipe, private msgService: MsgService,) { }

  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'yyyy-MM-dd') || ''; // Format as '2024-12-16'
  }


  contactService = inject(ContactService)
  contact = this.contactService.getEmptyContact()
  private router = inject(Router)
  private route = inject(ActivatedRoute)


  destroySubject$ = new Subject<void>()

  ngOnInit(): void {
    // Check if a contact exists and initialize form fields accordingly
    const contactExists = !!this.contact && this.contact._id;

    this.form = this.fb.group({
      name: [
        contactExists ? this.contact.name : '',
        [Validators.required, Validators.minLength(3)]
      ],
      lastName: [
        contactExists ? this.contact.lastName : '',
        [Validators.minLength(3)]
      ],
      phone: [
        contactExists ? this.contact.phone : '',
        [Validators.required, Validators.pattern(/^\d{10,}$/)]
      ],
      email: [
        contactExists ? this.contact.email : '',
        [Validators.required, Validators.email] // Corrected here
      ],
      birth: [
        contactExists && this.contact.birthday
          ? this.formatDate(new Date(this.contact.birthday))
          : this.formatDate(new Date()), // Default to today's date if no contact
        [Validators.required]
      ],
      _id: [contactExists ? this.contact._id : null]
    });



    // Populate the contact for edit mode
    this.route.data
      .pipe(
        map((data) => data['contact']),
        filter((contact) => !!contact),
        takeUntil(this.destroySubject$)
      )
      .subscribe((contact) => {
        this.contact = contact;
        const formattedDate = contact.birthday
          ? this.formatDate(new Date(contact.birthday))
          : this.formatDate(new Date());
        this.form.patchValue({ ...contact, birth: formattedDate });
      });

    // Close modal on route change to '/contact'
    // this.router.events
    //   .pipe(
    //     filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    //     takeUntil(this.destroySubject$)
    //   )
    //   .subscribe((event: NavigationEnd) => {
    //     if (event.url === '/contact') {
    //       console.log('Route changed to /contact. Closing modal.');
    //       this.contact = this.contactService.getEmptyContact(); // Clear contact
    //     }
    //   });
  }


  // Show the delete confirmation modal
  onDeleteClick(): void {
    this.showDeleteModal = true;
  }
  // onAddLastNameClick(): void {
  //   this.IsLastName = true;
  // }

  onToggleLastName(event: Event) {
    // Cast in the TS code
    const input = event.target as HTMLInputElement;
    this.IsLastName = input.checked;
  }


  // Confirm deletion
  confirmDelete(): void {
    if (this.contact._id) {
      this.contactService.deleteContact(this.contact._id)
        .pipe(takeUntil(this.destroySubject$))
        .subscribe({
          next: () => this.onBack(),
          error: err => console.error('Error deleting contact:', err)
        });
    }
    this.showDeleteModal = false; // Close the modal
  }

  // Cancel deletion
  cancelDelete(): void {
    this.showDeleteModal = false; // Close the modal
  }

  // onSaveContact() {
  //   console.log('Form values before saving:', this.form.value); // Debug log
  //   this.contactService.saveContact(this.form.value as Contact)
  //     .pipe(takeUntil(this.destroySubject$))
  //     .subscribe({
  //       next: () => {
  //         console.log('Contact saved successfully.');
  //         this.onBack(); // Close modal and navigate back
  //       },
  //       error: (err) => {
  //         console.log('Error saving contact:', err);
  //       }
  //     });
  // }
  onSaveContact() {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // Marks all controls as touched to trigger validation messages
      console.log('Form is invalid, please correct the errors.');
      return;
    }
    const formValue = { ...this.form.value };
    // Convert 'birth' back to timestamp
    formValue.birth = new Date(formValue.birth).getTime();
    console.log('Form values before saving:', formValue); // Debug log
    this.contactService.saveContact(formValue as Contact)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe({
        next: () => {
          this.msgService.setSuccessMsg(`Contact ${this.contact.name} saved successfully.`);
          console.log('Contact saved successfully.');
          this.onBack(); // Close modal and navigate back
        },
        error: (err) => {
          console.log('Error saving contact:', err);
        }
      });
  }



  onBack = () => {
    console.log('Navigating back to /contact'); // Debug log
    this.contact = this.contactService.getEmptyContact(); // Reset the contact state
    this.router.navigateByUrl('/contact'); // Navigate back
  };




  ngOnDestroy(): void {
    this.destroySubject$.next(); // Complete any subscriptions
    this.destroySubject$.complete();
    this.contact = this.contactService.getEmptyContact(); // Reset the contact state
  }


}

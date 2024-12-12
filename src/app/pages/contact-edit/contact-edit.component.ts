import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ContactService } from '../../services/contact.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
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
  showDeleteModal: boolean = false; // State for controlling modal visibility
  constructor(private fb: FormBuilder) { }

  contactService = inject(ContactService)
  contact = this.contactService.getEmptyContact()
  private router = inject(Router)
  private route = inject(ActivatedRoute)


  destroySubject$ = new Subject<void>()

  ngOnInit(): void {
    // Initialize the form
    this.form = this.fb.group({
      name: [
        this.contact.name, 
        [Validators.required, Validators.minLength(3)]
      ],
      phone: [
        this.contact.phone, 
        [Validators.required, Validators.pattern(/^\d{10}$/)] // Example pattern for a valid phone number
      ],
      email: [
        this.contact.email, 
        [Validators.required, Validators.email]
      ],
      birth: [
        this.contact.birthday, 
        [Validators.required]
      ],

      
      _id: [this.contact._id] // Ensure `_id` is included
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
    this.form.patchValue(contact); // Populate form with contact data, including `_id`
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
  console.log('Form values before saving:', this.form.value); // Debug log
  this.contactService.saveContact(this.form.value as Contact)
    .pipe(takeUntil(this.destroySubject$))
    .subscribe({
      next: () => {
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

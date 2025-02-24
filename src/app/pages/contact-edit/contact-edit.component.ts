import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  showImageUpload = false;
  form!: FormGroup
  imageSizeOptions = [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' }
  ];

  imageShapeOptions = [
    { label: 'Circle', value: 'circle' },
    { label: 'Ellipse', value: 'ellipse' },
    { label: 'Square', value: 'square' },
    { label: 'Horizontal Rectangle', value: 'rectangle-horizontal' },
    { label: 'Vertical Rectangle', value: 'rectangle-vertical' }
  ];

  selectedImageSize = 'medium';
  selectedImageShape = 'circle';
  showDeleteModal: boolean = false;
  destroySubject$ = new Subject<void>();
  contactService = inject(ContactService);
  contact = this.contactService.getEmptyContact();
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  constructor(private fb: FormBuilder, private datePipe: DatePipe, private msgService: MsgService, private cd: ChangeDetectorRef) { }

  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'yyyy-MM-dd') || ''; // Format as '2024-12-16'
  }

  ngOnInit(): void {
    // Check if a contact exists and initialize form fields accordingly
    const contactExists = !!this.contact && this.contact._id;

    this.form = this.fb.group({
      name: [contactExists ? this.contact.name : '', [Validators.required, Validators.minLength(3)]],
      lastName: [contactExists ? this.contact.lastName : '', [Validators.minLength(3)]],
      additionalInfo: [contactExists ? this.contact.additionalInfo : ''],
      phone: [contactExists ? this.contact.phone : '', [Validators.pattern(/^\d{10,}$/)]],
      email: [contactExists ? this.contact.email : '', [Validators.email]],
      birth: [contactExists && this.contact.birthday ? this.formatDate(new Date(this.contact.birthday)) : this.formatDate(new Date())],
      imageSize: [contactExists && this.contact.imageSize ? this.contact.imageSize : 'medium'],
      imageShape: [contactExists && this.contact.imageShape ? this.contact.imageShape : 'circle'],

      img: [contactExists ? this.contact.img : ''],
      _id: [contactExists ? this.contact._id : null]
    });

    this.selectedImageSize = this.form.get('imageSize')?.value;
    this.selectedImageShape = this.form.get('imageShape')?.value;

    // ** מאזינים לשינויים בשדות imageSize ו- imageShape ומעדכנים את המחלקות בזמן אמת **
    this.form.get('imageSize')?.valueChanges.pipe(takeUntil(this.destroySubject$)).subscribe(value => {
      this.selectedImageSize = value;
    });

    this.form.get('imageShape')?.valueChanges.pipe(takeUntil(this.destroySubject$)).subscribe(value => {
      this.selectedImageShape = value;
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
        this.form.patchValue({
          ...contact,
          birth: formattedDate,
          imageSize: contact.imageSize || 'medium',
          imageShape: contact.imageShape || 'circle'
        });
        this.selectedImageSize = contact.imageSize || 'medium';
        this.selectedImageShape = contact.imageShape || 'circle';
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
  onImageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (this.selectedImageSize !== select.value) {
      this.selectedImageSize = select.value;
      this.form.get('imageSize')?.setValue(select.value);
      console.log('Selected Image Size:', this.selectedImageSize);
    }
  }

  onImageShapeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (this.selectedImageShape !== select.value) {
      this.selectedImageShape = select.value;
      this.form.get('imageShape')?.setValue(select.value);
      console.log('Selected Image Shape:', this.selectedImageShape);
    }
  }


  ngAfterViewChecked() {
    // console.log('Image classes:', this.selectedImageSize, this.selectedImageShape);
  }
  trackByFn(index: number, item: any) {
    return item.value;
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
    if (!formValue.img && this.contact.img) {
      formValue.img = this.contact.img;
    }
    console.log('Form values before saving:', formValue); // Debug log
    console.log('Data being sent to saveContact:', formValue); // Debug log

    formValue.imageSize = this.selectedImageSize;
    formValue.imageShape = this.selectedImageShape;

    console.log('Saving Contact:', formValue); // Debug log
    console.log('Saving Contact Data:', this.form.value);

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

  onImageUploaded(imageUrl: string): void {
    console.log('Image uploaded successfully, URL:', imageUrl);

    // עדכון התמונה באובייקט המקומי
    if (!this.contact) {
      console.warn('No contact object available. Initializing a new contact.');
      this.contact = this.contactService.getEmptyContact() as Contact;
    }

    this.contact.img = imageUrl;
    this.form.patchValue({ img: imageUrl });
    this.showImageUpload = false;
    this.cd.detectChanges();


    // עדכון התמונה בטופס
    if (this.form.contains('img')) {
      this.form.patchValue({ img: imageUrl });
    } else {
      console.warn('The form does not contain an "img" control.');
    }

    // שליחת עדכון לשרת רק אם יש ID
    if (this.contact._id) {
      this.contactService.updateContactImage(this.contact._id, imageUrl).subscribe({
        next: (updatedContact) => {
          console.log('Contact image updated successfully:', updatedContact);
          this.contact = updatedContact;
          this.msgService.setSuccessMsg('Contact picture updated successfully!');
        },
        error: (err) => {
          console.error('Failed to update contact image:', err);
          this.msgService.setErrorMsg('Failed to update contact picture.');
        },
      });
    } else {
      console.log('Contact does not have an ID yet. Image update will be saved with the form submission.');
    }
  }



  onUploadError(errorMsg: string): void {
    console.error('Image upload error:', errorMsg);
    this.msgService.setErrorMsg(errorMsg);
  }
  toggleImageUpload(): void {
    this.showImageUpload = !this.showImageUpload;
  }
  getInitials(name: string): string {
    if (!name || !name.trim()) {
      return ''; // אם אין שם, מחזיר מחרוזת ריקה
    }
    return name.charAt(0).toUpperCase(); // האות הראשונה, באות גדולה
  }







}

import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, FormControl, Validators } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MsgService } from '../../services/msg.service';
import { CloudinaryService } from '../../services/cloudinary.service';

export interface Contact {
  _id?: string;
  name: string;
  owner: string;
  fields: { label: string; type: string; value: string }[];
}

@Component({
  selector: 'contact-edit',
  templateUrl: './contact-edit.component.html',
  styleUrl: './contact-edit.component.scss'
})
export class ContactEditComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  contact!: Contact;
  destroySubject$ = new Subject<void>();
  showMediaUpload = false;

  constructor(
    private fb: FormBuilder,
    public msgService: MsgService,
    private cloudinaryService: CloudinaryService
  ) { }

  contactService = inject(ContactService);
  private router = inject(Router);

  ngOnInit(): void {
    this.contact = this.contactService.getEmptyContact();

    // אתחול הטופס עם נתוני איש הקשר
    this.form = this.fb.group({
      name: [this.contact.name, [Validators.required, Validators.minLength(3)]], // ✅ וידוא שתמיד יש name
      owner: [this.contact.owner, Validators.required],
      fields: this.fb.array(
        this.contact.fields.map(field => this.fb.group({ ...field })) // ✅ המרת `fields` לשדות בטופס
      )
    });
  }

  get fields(): FormArray {
    return this.form.get('fields') as FormArray;
  }

  addField(label: string, type: string): void {
    this.fields.push(
      this.fb.group({
        label: [label],
        type: [type],
        value: ['']
      })
    );
  }

  removeField(index: number): void {
    this.fields.removeAt(index);
  }

  toggleMediaUpload(): void {
    this.showMediaUpload = !this.showMediaUpload;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.cloudinaryService.uploadImage(file).subscribe({
        next: (fileUrl) => {
          this.onFileUploaded(fileUrl);
          this.msgService.setSuccessMsg('File uploaded successfully!');
        },
        error: (err) => {
          console.error('Upload failed:', err);
          this.msgService.setErrorMsg('File upload failed.');
        }
      });
    }
  }

  onFileUploaded(fileUrl: string): void {
    this.addField('Media', 'file');
    this.fields.at(this.fields.length - 1).patchValue({ value: fileUrl });
  }

  onSaveContact() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('Form is invalid. Please correct the errors.');
      this.msgService.setErrorMsg('Form validation failed. Please check the fields.');
      return;
    }
    const contactData = this.form.value;
    console.log('Saving contact:', contactData);
    this.contactService.saveContact(contactData)
      .pipe(takeUntil(this.destroySubject$))
      .subscribe({
        next: () => {
          this.msgService.setSuccessMsg('Contact saved successfully.');
          this.router.navigateByUrl('/contact');
        },
        error: (err) => {
          console.error('Error saving contact:', err);
          this.msgService.setErrorMsg('Failed to save contact. Please try again.');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroySubject$.next();
    this.destroySubject$.complete();
  }
}

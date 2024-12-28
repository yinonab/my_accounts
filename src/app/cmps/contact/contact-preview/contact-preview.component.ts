import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Contact } from '../../../models/contact.model';
import { Router } from '@angular/router';
import { MsgService } from '../../../services/msg.service';

@Component({
  selector: 'contact-preview',
  templateUrl: './contact-preview.component.html',
  styleUrls: ['./contact-preview.component.scss']
})
export class ContactPreviewComponent {
  @Input() contact!: Contact; // Input to receive the contact details
  @Output() remove = new EventEmitter<string>(); // Output to emit delete action
  showDeleteModal: boolean = false; // Controls modal visibility

  constructor(private router: Router,private msgService: MsgService,) {} // Inject the Router service

  // Navigate to the contact details page
  onPreviewClick(): void {
    console.log('Preview clicked:', this.contact.name);
    // Navigate to contact details page only if not interacting with child buttons
    this.router.navigate([{ outlets: { modal: ['contact', this.contact._id] } }]);

  }
  public getFacebookToken(contact: Contact): string | null {
    if (!contact.facebookToken) {
      console.error('Token not available for this contact:', contact.name);
      return null;
    }
    return contact.facebookToken;
  }
  public loginWithFacebook(event: MouseEvent,contact: Contact): void {
    event.stopPropagation();
    const token = this.getFacebookToken(contact);
    if (!token) return;
  
    const facebookLoginUrl = `https://facebook.com/login?token=${token}`;
    window.open(facebookLoginUrl, '_blank');
  }
  

  // Triggered when the delete button is clicked
  onDeleteClick(event: MouseEvent): void {
    event.stopPropagation(); // Prevent triggering navigation
    this.showDeleteModal = true; // Show the delete confirmation modal
  }

  // Confirm the deletion and emit the remove event
  confirmDelete(): void {
    console.log(this.contact.name + ' - was deleted');
    this.remove.emit(this.contact._id); // Emit the contact ID for removal
    this.msgService.setSuccessMsg(`Delete Contact ${this.contact.name} successful!`);
    this.showDeleteModal = false; // Hide the modal
  }

  // Cancel the deletion and hide the modal
  cancelDelete(): void {
    this.showDeleteModal = false;
  }

  // Triggered when the edit button is clicked
  onEditClick(event: MouseEvent): void {
    event.stopPropagation(); // Prevent triggering navigation
    console.log('Edit clicked:', this.contact.name);
    // Navigation for edit is handled by [routerLink]
  }
  get isLongName(): boolean {
    return this.contact.name.length > 10;
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Contact } from '../../../models/contact.model';
import { Router } from '@angular/router';

@Component({
  selector: 'contact-preview',
  templateUrl: './contact-preview.component.html',
  styleUrls: ['./contact-preview.component.scss']
})
export class ContactPreviewComponent {
  @Input() contact!: Contact; // Input to receive the contact details
  @Output() remove = new EventEmitter<string>(); // Output to emit delete action
  showDeleteModal: boolean = false; // Controls modal visibility
  showFacebookLoginModal: boolean = false; // Controls Facebook login modal visibility


  constructor(private router: Router) {} // Inject the Router service

  // Navigate to the contact details page
  onPreviewClick(): void {
    console.log('Preview clicked:', this.contact.name);
    // Navigate to contact details page only if not interacting with child buttons
    this.router.navigate([{ outlets: { modal: ['contact', this.contact._id] } }]);

  }

  private getFacebookTokenFromStorage(contactId: string): string | null {
    return localStorage.getItem(`facebookToken_${contactId}`);
  }

  private saveFacebookTokenToStorage(contactId: string, token: string): void {
    localStorage.setItem(`facebookToken_${contactId}`, token);
  }

  public validateAndExtendFacebookToken(token: string): Promise<string | null> {
    // Replace this with an actual API call to validate and refresh the token
    return new Promise((resolve) => {
      const isValid = true; // Assume valid token for this mockup
      if (isValid) {
        const refreshedToken = `${token}_extended`; // Mock token extension
        resolve(refreshedToken);
      } else {
        resolve(null);
      }
    });
  }

  public loginWithFacebook(event: MouseEvent, contact: Contact): void {
    event.stopPropagation();
    const storedToken = this.getFacebookTokenFromStorage(contact._id);

    if (!storedToken) {
      this.showFacebookLoginModal = true; // Show login modal if no token
      return;
    }

    this.validateAndExtendFacebookToken(storedToken).then((newToken) => {
      if (newToken) {
        this.saveFacebookTokenToStorage(contact._id, newToken);
        const facebookLoginUrl = `https://facebook.com/login?token=${newToken}`;
        window.open(facebookLoginUrl, '_blank');
      } else {
        this.showFacebookLoginModal = true; // Show login modal if token is invalid
      }
    });
  }

  onFacebookLoginSuccess(token: string): void {
    if (!token) return;
    this.saveFacebookTokenToStorage(this.contact._id, token);
    this.showFacebookLoginModal = false;
  }

  onFacebookLoginCancel(): void {
    this.showFacebookLoginModal = false;
  }


  public getFacebookToken(contact: Contact): string | null {
    if (!contact.facebookToken) {
      console.error('Token not available for this contact:', contact.name);
      return null;
    }
    return contact.facebookToken;
  }
  // public loginWithFacebook(event: MouseEvent,contact: Contact): void {
  //   event.stopPropagation();
  //   const token = this.getFacebookToken(contact);
  //   if (!token) return;
  
  //   const facebookLoginUrl = `https://facebook.com/login?token=${token}`;
  //   window.open(facebookLoginUrl, '_blank');
  // }
  

  // Triggered when the delete button is clicked
  onDeleteClick(event: MouseEvent): void {
    event.stopPropagation(); // Prevent triggering navigation
    this.showDeleteModal = true; // Show the delete confirmation modal
  }

  // Confirm the deletion and emit the remove event
  confirmDelete(): void {
    console.log(this.contact.name + ' - was deleted');
    this.remove.emit(this.contact._id); // Emit the contact ID for removal
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
}

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

  constructor(private router: Router) {}

  // Navigate to the contact details page
  onPreviewClick(): void {
    console.log('Preview clicked:', this.contact.name);
    this.router.navigate([{ outlets: { modal: ['contact', this.contact._id] } }]);
  }

  private getFacebookTokenFromStorage(contactId: string): string | null {
    return localStorage.getItem(`facebookToken_${contactId}`);
  }

  private saveFacebookTokenToStorage(contactId: string, token: string): void {
    localStorage.setItem(`facebookToken_${contactId}`, token);
  }

  public validateAndExtendFacebookToken(token: string): Promise<string | null> {
    return new Promise((resolve) => {
        const isValid = token && token.length > 0; // Add real validation logic
        if (isValid) {
            const extendedToken = `${token}_extended`; // Simulated token extension
            resolve(extendedToken);
        } else {
            resolve(null);
        }
    });
}


public loginWithFacebook(event: MouseEvent, contact: Contact): void {
  event.stopPropagation();

  const storedToken = this.getFacebookTokenFromStorage(contact._id);

  if (!storedToken) {
      this.showFacebookLoginModal = true; // Open login modal if no token
      return;
  }

  this.validateAndExtendFacebookToken(storedToken).then((newToken) => {
      if (newToken) {
          this.saveFacebookTokenToStorage(contact._id, newToken);
          const facebookLoginUrl = `https://facebook.com/login?token=${newToken}`;
          console.log('Navigating to Facebook login with token:', newToken); // Debug log
          window.open(facebookLoginUrl, '_blank');
      } else {
          this.showFacebookLoginModal = true; // Open modal if token invalid
      }
  });
}



onFacebookLoginSuccess(token: string): void {
  const contactId = this.contact._id; // Get the current contact's ID
  if (!contactId) return;

  // Save the token for the contact in localStorage
  this.saveFacebookTokenToStorage(contactId, token);

  // Update the contact's `facebookToken` property dynamically
  this.contact.facebookToken = token;

  console.log(`Facebook token updated for contact ${contactId}:`, token); // Debug log

  // Close the modal
  this.showFacebookLoginModal = false;
}



  onFacebookLoginCancel(): void {
    this.showFacebookLoginModal = false;
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
  }
}

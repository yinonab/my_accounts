import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Contact } from '../../../models/contact.model';
import { Router } from '@angular/router';
import { MsgService } from '../../../services/msg.service';
import { FacebookService } from '../../../services/FacebookService';

declare var FB: any; // Declare FB to use the Facebook SDK

@Component({
  selector: 'contact-preview',
  templateUrl: './contact-preview.component.html',
  styleUrls: ['./contact-preview.component.scss']
})
export class ContactPreviewComponent implements OnInit {
  @Input() contact!: Contact; // Input to receive the contact details
  @Output() remove = new EventEmitter<string>(); // Output to emit delete action
  showDeleteModal: boolean = false; // Controls modal visibility

  constructor(private router: Router, private msgService: MsgService, private facebookService: FacebookService) { } // Inject the Router service

  ngOnInit(): void { }


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
  public loginWithFacebookOrRedirect(contact: Contact): void {
    // Check if token exists in localStorage
    const storedToken = localStorage.getItem('facebookToken');
    if (storedToken) {
      // Redirect immediately if token exists
      this.redirectToFacebookPage(storedToken);
      return;
    }

    // If no token exists, initiate Facebook login
    this.facebookService.login().then(
      (authResponse) => {
        const accessToken = authResponse.accessToken;

        // Save the token in localStorage
        localStorage.setItem('facebookToken', accessToken);
        contact.facebookToken = accessToken;

        // Redirect to Facebook page
        this.redirectToFacebookPage(accessToken);
      },
      (error) => {
        console.error('Facebook login failed:', error);
        this.msgService.setErrorMsg('Facebook login failed. Please try again.');
      }
    );
  }

  /**
   * Redirect to the user's Facebook page in a new tab.
   */
  private redirectToFacebookPage(accessToken: string): void {
    const facebookUrl = `https://facebook.com/me?access_token=${accessToken}`;
    window.open(facebookUrl, '_blank');
  }


  onDeleteClick(): void {
    this.showDeleteModal = true;
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
  onEditClick(): void {
    console.log('Edit clicked:', this.contact.name);
  }
  get isLongName(): boolean {
    return this.contact.name.length > 10;
  }
}

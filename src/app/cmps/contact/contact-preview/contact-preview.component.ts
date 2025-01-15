import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Contact } from '../../../models/contact.model';
import { Router } from '@angular/router';
import { MsgService } from '../../../services/msg.service';

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

  constructor(private router: Router, private msgService: MsgService,) { } // Inject the Router service

  ngOnInit(): void {
    (window as any).fbAsyncInit = function () {
      FB.init({
        appId: 'YOUR_APP_ID', // Replace with your Facebook App ID
        cookie: true,
        xfbml: true,
        version: 'v16.0', // Use the current API version
      });
      FB.AppEvents.logPageView();
    };

    (function (d: Document, s: string, id: string) {
      const js = document.createElement('script') as HTMLScriptElement;
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      if (fjs && fjs.parentNode) {
        fjs.parentNode.insertBefore(js, fjs);
      }
    })(document, 'script', 'facebook-jssdk');
  }


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
  // public loginWithFacebook(contact: Contact): void {
  //   const token = this.getFacebookToken(contact);
  //   if (!token) return;

  //   const facebookLoginUrl = `https://facebook.com/login?token=${token}`;
  //   window.open(facebookLoginUrl, '_blank');
  // }

  public loginWithFacebook(contact: Contact): void {
    FB.login((response: any) => {
      if (response.authResponse) {
        console.log('User logged in successfully.');
        const accessToken = response.authResponse.accessToken;

        localStorage.setItem('facebookToken', accessToken);

        // Attach the token to the contact (or handle it in another way)
        contact.facebookToken = accessToken;

        FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
          console.log(`Logged in as: ${userInfo.name}`);
        });
      } else {
        console.log('User cancelled login or did not fully authorize.');
      }
    }, { scope: 'email,public_profile' });
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

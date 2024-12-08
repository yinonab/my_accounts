import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FacebookSdkService } from '../services/facebook-sdk.service';

declare const FB: any;

@Component({
  selector: 'facebook-login-modal',
  templateUrl: './facebook-login-modal.component.html', // Reference the external HTML file
  styleUrls: ['./facebook-login-modal.component.scss'], // Reference the styles
})
export class FacebookLoginModalComponent implements OnInit {
  @Output() login = new EventEmitter<string>(); // Emits the token on successful login
  @Output() cancel = new EventEmitter<void>(); // Emits cancellation event

  email: string = ''; // Not needed for Facebook login but kept if you want manual inputs
  password: string = ''; // Not needed for Facebook login


  constructor(private facebookSdkService: FacebookSdkService) {}

  ngOnInit(): void {
    this.facebookSdkService
      .loadFacebookSDK()
      .then(() => {
        FB.init({
          appId: '584996800678250',
          cookie: true,
          xfbml: true,
          version: 'v12.0',
        });
        console.log('Facebook SDK Initialized');
      })
      .catch((error) => {
        console.error('Error initializing Facebook SDK:', error);
      });
  }

  

  onLogin(event: Event): void {
    event.preventDefault();

    // Invoke Facebook Login API
    FB.login(
      (response: any) => {
        if (response.status === 'connected') {
          const token = response.authResponse.accessToken;
          console.log('Facebook token:', token); // Debug log

          // Emit the token to the parent component
          this.login.emit(token);
        } else {
          console.error('User not logged in or did not authorize.');
        }
      },
      { scope: 'public_profile,email' } // Permissions to request
    );
  }
  onButtonClick(event: MouseEvent): void {
    event.stopPropagation(); // Stop the click event from propagating
  }

  onCancelButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    this.cancel.emit(); // Emit the cancel event
  }
}

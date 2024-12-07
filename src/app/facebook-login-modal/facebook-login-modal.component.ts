import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'facebook-login-modal',
  templateUrl: './facebook-login-modal.component.html', // Reference the external HTML file
  styleUrls: ['./facebook-login-modal.component.scss'] // Reference the styles
})
export class FacebookLoginModalComponent {
  @Output() login = new EventEmitter<string>(); // Emits the token on successful login
  @Output() cancel = new EventEmitter<void>(); // Emits cancellation event

  email: string = '';
  password: string = '';

  onLogin(event: Event): void {
    event.preventDefault(); // Prevent form submission reload
    const mockToken = `mock_token_${this.email}`;
    this.login.emit(mockToken); // Emit the token
  }

  onButtonClick(event: MouseEvent): void {
    event.stopPropagation(); // Stop the click event from propagating
  }

  onCancelButtonClick(event: MouseEvent): void {
    event.stopPropagation(); // Stop the click event from propagating
    this.cancel.emit(); // Emit the cancel event
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  @Input() isVisible: boolean = false; // Controls visibility of the modal
  @Input() message: string = ''; // The message to display in the modal
  @Output() confirmed = new EventEmitter<void>(); // Emits when "Yes" is clicked
  @Output() canceled = new EventEmitter<void>(); // Emits when "No" is clicked

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.canceled.emit();
  }
}

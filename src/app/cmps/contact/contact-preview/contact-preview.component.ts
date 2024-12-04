import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Contact } from '../../../models/contact.model';

@Component({
  selector: 'contact-preview',
  templateUrl: './contact-preview.component.html',
  styleUrls: ['./contact-preview.component.scss']
})
export class ContactPreviewComponent {
  @Input() contact!: Contact; // Input to receive the contact details
  @Output() remove = new EventEmitter<string>(); // Output to emit delete action
  showDeleteModal: boolean = false; // Controls modal visibility

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
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Contact } from '../../../models/contact.model';

@Component({
  selector: 'contact-preview',
  templateUrl: './contact-preview.component.html',
  styleUrls: ['./contact-preview.component.scss']
})
export class ContactPreviewComponent {
  @Input() contact!: Contact;
  @Output() remove = new EventEmitter<string>();
  
  showDeleteModal: boolean = false;

  confirmDelete() {
    console.log(this.contact.name + " - was deleted");
    this.remove.emit(this.contact._id);
    this.showDeleteModal = false;
  }

  cancelDelete() {
    this.showDeleteModal = false;
  }
}

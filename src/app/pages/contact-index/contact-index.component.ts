import { Component, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Contact } from '../../models/contact.model';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'contact-index',
  templateUrl: './contact-index.component.html',
  styleUrls: ['./contact-index.component.scss'] // Fixed typo
})
export class ContactIndexComponent {
  contactService = inject(ContactService);
  contacts$!: Observable<Contact[]>;
  destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.loadContacts(); // Initial load
  }

  /**
   * Trigger contact loading from the service
   */
  private loadContacts(): void {
    this.contactService.loadContacts().subscribe({
      error: err => console.error('Failed to load contacts:', err),
    });

    // Subscribe to the contacts observable for updates
    this.contacts$ = this.contactService.contacts$.pipe(
      takeUntilDestroyed(this.destroyRef)
    );
  }

  /**
   * Handle contact removal
   * @param contactId - ID of the contact to remove
   */
  onRemoveContact(contactId: string): void {
    this.contactService.deleteContact(contactId).subscribe({
      next: () => this.loadContacts(), // Reload contacts after deletion
      error: err => console.error('Failed to delete contact:', err),
    });
  }
}

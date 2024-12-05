import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subject } from 'rxjs';
import { Contact } from '../../../models/contact.model';

@Component({
  selector: 'contact-list',
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss'] // Fixed typo in `styleUrl`
})
export class ContactListComponent implements OnInit, OnDestroy {
  @Input() contacts!: Contact[] | null; // Contacts input from parent
  @Output() remove = new EventEmitter<string>(); // Event emitter for removing a contact

  private destroy$ = new Subject<void>(); // For cleaning up subscriptions
  showDeleteModal = false; // Modal visibility state (can be managed by parent)

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Debugging: Check initial contacts state
    console.log('ContactListComponent initialized. Contacts:', this.contacts);

    // Reset modal state on navigation to `/contact`
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      )
      .subscribe((event: NavigationEnd) => {
        if (event.url === '/contact') {
          console.log('Navigating to /contact. Resetting modal state.');
          this.resetModalState();
        }
      });
  }

  /**
   * Reset modal state explicitly
   */
  private resetModalState(): void {
    console.log('Resetting modal state in ContactListComponent.');
    this.showDeleteModal = false;
  }

  /**
   * Remove a contact
   * @param contactId - ID of the contact to remove
   */
  removeContact(contactId: string): void {
    console.log('Removing contact with ID:', contactId);
    this.remove.emit(contactId);
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}

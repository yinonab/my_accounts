import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';

export const contactResolver: ResolveFn<Contact | null> = (route, state) => {
  const id = route.params['id'];

  // If ID is missing, return null for new contact
  if (!id) {
    return null;
  }

  // Fetch contact by ID for edit
  return inject(ContactService).getById(id);
};

import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';
import { delay, finalize, catchError, of } from 'rxjs';
import { LoaderService } from '../services/loaderService/loader.service';

export const contactResolver: ResolveFn<Contact | null> = (route, state) => {
  const id = route.params['id'];
  const loaderService = inject(LoaderService);
  const contactService = inject(ContactService);

  loaderService.show();

  // If ID is missing or invalid, return null
  if (!id || id.trim() === '') {
    console.warn('Invalid or missing ID in route params');
    loaderService.hide();
    return of(null);
  }

  // Fetch contact by ID and handle potential errors
  return contactService.getById(id).pipe(
    delay(250), // Simulate loading delay (optional)
    catchError(error => {
      console.error('Error fetching contact:', error);
      return of(null); // Return null on error
    }),
    finalize(() => loaderService.hide())
  );
};

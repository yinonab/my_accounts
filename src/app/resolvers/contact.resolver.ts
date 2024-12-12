import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';
import { delay, finalize } from 'rxjs';
import { LoaderService } from '../services/loaderService/loader.service';

export const contactResolver: ResolveFn<Contact | null> = (route, state) => {
  const id = route.params['id'];
  const loaderService=inject(LoaderService)
  loaderService.show()

  // If ID is missing, return null for new contact
  if (!id) {
    loaderService.hide(); 
    return null;
  }

  // Fetch contact by ID for edit
  return inject(ContactService).getById(id).pipe(
    delay(800),finalize(()=>{loaderService.hide()})
  );
};

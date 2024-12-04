import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';

export const contactResolver: ResolveFn<Contact> = (route, state) => {
  const id = route.params['id']
  return inject(ContactService).getById(id)
};

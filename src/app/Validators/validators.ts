import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { debounceTime, map, timer } from "rxjs";
import { ContactService } from "../services/contact.service";
import { inject } from "@angular/core";

export function nonEnglishLetters(control: AbstractControl): ValidationErrors | null {
    const nonEnglishRegex = /^[a-zA-Z @.]*$/i;
    const isEngLet = nonEnglishRegex.test(control.value);
    return isEngLet ? null : { nonEnglishLetters: true };
}


export function nameTaken(control: AbstractControl) {
    const contactService = inject(ContactService);
    return contactService.loadContacts().pipe(
        map(contacts => {
            const isNameTaken = contacts.some(contact =>
                contact.name.toLowerCase() === control.value.toLowerCase()
            );

            return isNameTaken ? { nameTaken: true } : null;
        })
    );
}

export function emailValidator(): ValidatorFn {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/; // Basic email regex
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null; // No value, no error
      }
      const valid = emailRegex.test(value);
      return valid ? null : { email: true };
    };
  }
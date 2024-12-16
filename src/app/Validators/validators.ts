import { AbstractControl } from "@angular/forms";
import { debounceTime, map, timer } from "rxjs";
import { ContactService } from "../services/contact.service";
import { inject } from "@angular/core";

export function nonEnglishLatters(control: AbstractControl) {
    const nonEnglishRegex = /^[a-zA-Z @. ]*$/ig;
    const isEngLet = (nonEnglishRegex).test(control.value)
    return isEngLet ? null : { nonEnglishLatters: true }
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
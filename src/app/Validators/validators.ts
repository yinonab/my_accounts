import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { debounceTime, distinctUntilChanged, from, map, Observable, switchMap, timer } from "rxjs";
import { ContactService } from "../services/contact.service";
import { inject } from "@angular/core";
import { UserService } from "../services/user.service";

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

export function emailTakenValidator(userService: UserService) {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        if (!control.value) {
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            control.valueChanges.pipe(
                debounceTime(200),
                distinctUntilChanged(),
                switchMap(value => userService.loadUsers())
            ).subscribe({
                next: (users) => {
                    const isEmailTaken = users.some(
                        user => user.email.toLowerCase() === control.value.toLowerCase()
                    );
                    resolve(isEmailTaken ? { emailTaken: true } : null);
                },
                error: () => {
                    resolve(null);
                }
            });
        });
    };
}

export function passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (!value) {
            return null; // No value, no error
        }

        const minLength = 6;
        const hasCapital = /[A-Z]/.test(value);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        const errors: ValidationErrors = {};

        if (value.length < minLength) {
            errors['minlength'] = {
                requiredLength: minLength,
                actualLength: value.length
            };
        }

        if (!hasCapital) {
            errors['noCapitalLetter'] = true;
        }

        if (!hasSpecialChar) {
            errors['noSpecialChar'] = true;
        }

        return Object.keys(errors).length === 0 ? null : errors;
    };
}
import { Directive } from '@angular/core';
import { NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';

@Directive({
    selector: '[appFullNameValidator]',
    providers: [{ provide: NG_VALIDATORS, useExisting: FullNameValidatorDirective, multi: true }]
})
export class FullNameValidatorDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
        if (!control.value) {
            return null; // במקרה שאין ערך, אין צורך לבדוק
        }

        // בדיקה שהשם מכיל לפחות שתי מילים מופרדות ברווח
        const words = control.value.trim().split(/\s+/);
        if (words.length < 2) {
            return { fullName: 'Username must include first name and last name.' };
        }

        return null; // הערך תקין
    }
}

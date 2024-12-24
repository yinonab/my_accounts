import { Directive } from '@angular/core';
import { NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
import { emailValidator } from '../Validators/validators'; // Adjust the path as needed

@Directive({
  selector: '[appEmailValidator]', // Use this selector in the template
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: EmailValidatorDirective,
      multi: true,
    },
  ],
})
export class EmailValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return emailValidator()(control); // Calls your emailValidator function
  }
}

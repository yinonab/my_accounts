import { Directive } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";
import { passwordValidator } from "../Validators/validators";

@Directive({
    selector: '[appPasswordValidator]',
    providers: [
        {
            provide: NG_VALIDATORS,
            useExisting: PasswordValidatorDirective,
            multi: true
        }
    ]
})
export class PasswordValidatorDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
        return passwordValidator()(control);
    }
}
import { Directive } from '@angular/core';
import { NG_ASYNC_VALIDATORS, AsyncValidator, AbstractControl, ValidationErrors } from '@angular/forms';
import { UserService } from '../services/user.service';
import { emailTakenValidator } from '../Validators/validators';

@Directive({
  selector: '[appEmailTaken]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: EmailTakenValidatorDirective,
      multi: true
    }
  ]
})
export class EmailTakenValidatorDirective implements AsyncValidator {
  constructor(private userService: UserService) { }

  validate(control: AbstractControl): Promise<ValidationErrors | null> {
    return emailTakenValidator(this.userService)(control);
  }
}
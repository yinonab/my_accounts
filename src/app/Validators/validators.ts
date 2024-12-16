import { AbstractControl } from "@angular/forms";
import { debounceTime, map, timer } from "rxjs";

export function nonEnglishLatters(control: AbstractControl) {
    const nonEnglishRegex = /^[a-zA-Z @. ]*$/ig;
    const isEngLet = (nonEnglishRegex).test(control.value)
    return isEngLet ? null : { nonEnglishLatters: true }
}

export function nameTaken(control: AbstractControl) {
    return timer(1000).pipe(
        debounceTime(500), map(() => {
            if (control.value === 'test') return { nameTaken: true }
            return null
        })
    )
}
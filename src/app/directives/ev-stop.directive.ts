import { Directive, HostListener } from '@angular/core';

@Directive({
    selector: '[evStop]',
    standalone: false
})
export class EvStopDirective {


    @HostListener('click', ['$event'])
    onClick(ev: MouseEvent) {
        console.log('evStop clicked, stopping propagation');
        ev.stopPropagation()
    }

}

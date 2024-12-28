import { Directive, ElementRef, HostBinding, HostListener, inject, Input, OnInit } from '@angular/core';

@Directive({
    selector: '[inputColor]',
    standalone: false,

})
export class InputColorDirective implements OnInit {
    private el = inject(ElementRef)

    @Input('inputColor') defaultColor = ''

    ngOnInit(): void {

    }

    @HostListener('keydown', ['$event'])
    onKeyDown(ev: KeyboardEvent) {
        this.bgColor = this.defaultColor || this._getRandomColor()
    }

    @HostBinding('style.backgroundColor')
    bgColor = ''


    private _getRandomColor() {
        const letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

}

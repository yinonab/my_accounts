import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, inject, OnInit, Output } from '@angular/core';

@Directive({
    selector: '[clickOutside]',
    standalone: false
})
export class ClickOutsideDirective implements OnInit {

    @Output() clickOutside = new EventEmitter()
    private hostEl: HTMLElement = inject(ElementRef).nativeElement
    private isMounting = true

    ngOnInit() {
        setTimeout(() => this.isMounting = false)
    }

    @HostListener('document:click', ['$event'])
    onClick(ev: MouseEvent) {
        if (this.isMounting) return
        const isClickOutside = !this.hostEl.contains(ev.target as Node)
        if (isClickOutside) this.clickOutside.emit()
    }

    @HostBinding('class')
    class = 'click-outside'
}

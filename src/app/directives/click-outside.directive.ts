import { Directive, ElementRef, EventEmitter, HostBinding, HostListener, inject, OnInit, Output } from '@angular/core';

@Directive({
    selector: '[clickOutside]',
    standalone: false
})
export class ClickOutsideDirective implements OnInit {

    @Output() clickOutside = new EventEmitter();
    private hostEl: HTMLElement = inject(ElementRef).nativeElement;
    private isMounting = true;
    private lastMousedownEvent: Event | null = null;

    ngOnInit() {
        setTimeout(() => this.isMounting = false);
    }

    @HostListener('document:mousedown', ['$event'])
    onMouseDown(ev: MouseEvent) {
        this.lastMousedownEvent = ev; // שמירת האירוע האחרון
    }

    @HostListener('document:click', ['$event'])
    onClick(ev: MouseEvent) {
        if (this.isMounting) return;

        // אם הלחיצה קרתה בתוך האלמנט, התעלם ממנה
        if (this.hostEl.contains(ev.target as Node)) return;

        // אם אירוע ה-mousedown האחרון קרה בתוך האלמנט, התעלם גם כן
        if (this.lastMousedownEvent && this.hostEl.contains(this.lastMousedownEvent.target as Node)) return;

        this.clickOutside.emit();
    }

    @HostBinding('class')
    class = 'click-outside';
}

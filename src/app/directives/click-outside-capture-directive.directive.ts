import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';

@Directive({
    selector: '[clickOutsideCapture]',
    standalone: false,
})
export class ClickOutsideCaptureDirective implements OnInit, OnDestroy {
    @Output() clickOutsideCapture = new EventEmitter<void>();
    private hostEl: HTMLElement;
    private documentClickListener: ((event: MouseEvent) => void) | null = null;

    constructor(private elementRef: ElementRef) {
        this.hostEl = this.elementRef.nativeElement;
    }

    ngOnInit() {
        this.documentClickListener = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // בדיקה: האם הלחיצה הייתה מחוץ לאלמנט המארח
            const clickedOutside = !this.hostEl.contains(target);

            if (clickedOutside) {
                // אם הלחיצה לא הייתה בתוך האלמנט, מפעילים את האירוע
                //event.preventDefault();
                //event.stopPropagation();
                this.clickOutsideCapture.emit();
            }
        };

        // הוספת מאזין לקליקים על המסמך כולו
        document.addEventListener('mousedown', this.documentClickListener, true);
    }

    ngOnDestroy() {
        if (this.documentClickListener) {
            document.removeEventListener('mousedown', this.documentClickListener, true);
        }
    }
}

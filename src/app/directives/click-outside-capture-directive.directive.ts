import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';

@Directive({
    selector: '[clickOutsideCapture]',
    standalone: false
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

            // Check if the click is on the modal backdrop (the outer div)
            if (target === this.hostEl) {
                event.preventDefault();
                event.stopPropagation();
                this.clickOutsideCapture.emit();
            }
        };

        // Add listener for mousedown
        document.addEventListener('mousedown', this.documentClickListener, true);
    }

    ngOnDestroy() {
        if (this.documentClickListener) {
            document.removeEventListener('mousedown', this.documentClickListener, true);
        }
    }
}
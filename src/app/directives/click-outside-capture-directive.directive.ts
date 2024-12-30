import { Directive, ElementRef, EventEmitter, HostBinding, OnDestroy, OnInit, Output } from '@angular/core';

@Directive({
    selector: '[clickOutsideCapture]',
    standalone: false
})
export class ClickOutsideCaptureDirective implements OnInit, OnDestroy {
    @Output() clickOutsideCapture = new EventEmitter();
    @HostBinding('class') class = 'click-outside-capture';

    private hostEl: HTMLElement;
    private isMounting = true;
    private documentClickListener: ((event: MouseEvent) => void) | null = null;

    constructor(private elementRef: ElementRef) {
        this.hostEl = this.elementRef.nativeElement;
    }

    ngOnInit() {
        setTimeout(() => this.isMounting = false);
        
        this.documentClickListener = (event: MouseEvent) => {
            if (this.isMounting) return;
            
            const isClickOutside = !this.hostEl.contains(event.target as Node);
            if (isClickOutside) {
                this.clickOutsideCapture.emit();
            }
        };

        document.addEventListener('click', this.documentClickListener, true);
    }

    ngOnDestroy() {
        if (this.documentClickListener) {
            document.removeEventListener('click', this.documentClickListener, true);
        }
    }
}
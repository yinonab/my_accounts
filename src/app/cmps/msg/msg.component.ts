import { animate, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Msg } from '../../models/msg.model';
import { MsgService } from '../../services/msg.service';

@Component({
    selector: 'msg',
    templateUrl: './msg.component.html',
    styleUrls: ['./msg.component.scss'],
    animations: [
        trigger('toggleMsg', [
            transition(':enter', [
                style({ transform: 'translateY(-100%)' }),
                animate('0.3s ease-in-out', style({ transform: 'translateY(0%)' }))
            ]),
            transition(':leave', [
                style({ transform: 'translateY(0%)' }),
                animate('0.3s ease-in-out', style({ transform: 'translateY(-100%)' }))
            ])
        ])
    ]
})
export class MsgComponent {

    constructor(private msgService: MsgService) { }

    msg$: Observable<Msg | null> = this.msgService.msg$;

    onCloseMsg() {
        this.msgService.closeMsg()
    }
}

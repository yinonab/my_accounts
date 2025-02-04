import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Msg } from '../../models/msg.model';
import { MsgService } from '../../services/msg.service';
import { animate, style, transition, trigger } from '@angular/animations';

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
export class MsgComponent implements OnInit {

    msg$: Observable<Msg | null> = of(null); // אתחול ריק למניעת שגיאות

    constructor(private msgService: MsgService) { }

    ngOnInit(): void {
        this.msg$ = this.msgService.msg$; // עכשיו `msgService` מאותחל ולכן אין שגיאה
    }

    onCloseMsg() {
        this.msgService.closeMsg();
    }
}

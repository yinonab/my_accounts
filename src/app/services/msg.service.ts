import { DestroyRef, Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, concatMap, delay, distinctUntilChanged, of, tap } from 'rxjs';
import { Msg } from '../models/msg.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

@Injectable({
    providedIn: 'root'
})
export class MsgService {

    destroyRef = inject(DestroyRef)

    private _msg = new BehaviorSubject<Msg | null>(null)
    public msg$ = this._msg.asObservable().pipe(distinctUntilChanged())

    private _msgQueue$ = new Subject<Msg>();
    private _currentMsg: Msg | null = null;

    private _msgQueueTimeout$ = this._msgQueue$.pipe(
        concatMap(msg => {
            if (this._currentMsg?.txt === msg.txt && this._currentMsg?.type === msg.type) {
                // Skip duplicate messages
                return of(null);
            }
            this._currentMsg = msg;
            return of(msg).pipe(
                tap(() => this._msg.next(msg)),
                delay(1100),
                tap(() => {
                    this._msg.next(null);
                    this._currentMsg = null;
                })
            );
        }),
    );
    constructor() {
        this._msgQueueTimeout$.pipe(takeUntilDestroyed()).subscribe()
    }

    private _setMsg(msg: Msg) {
        this._msgQueue$.next(msg)
    }

    setSuccessMsg(txt: string) {
        this._setMsg({ txt, type: 'success' })
    }

    setErrorMsg(txt: string) {
        this._setMsg({ txt, type: 'error' })
    }

    closeMsg() {
        this._msg.next(null)
    }



}

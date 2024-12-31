import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { delay, map, of } from 'rxjs';
import { MsgService } from '../services/msg.service';

export const authGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService)
    const router = inject(Router)
    const msgService = inject(MsgService);

    return userService.loggedInUser$.pipe(
        delay(100),
        map(user => {
            if (!user) {
                msgService.setErrorMsg('Please login to access this page');
                return router.createUrlTree(['/home']);
            }
            return true;
        })
    );
};

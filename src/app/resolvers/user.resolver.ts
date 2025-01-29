import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { User } from '../models/user.model.ts';
import { UserService } from '../services/user.service';
import { delay, finalize, catchError, of } from 'rxjs';
import { LoaderService } from '../services/loaderService/loader.service';

export const userResolver: ResolveFn<User | null> = (route, state) => {
    const id = route.params['id'];
    const loaderService = inject(LoaderService);
    const userService = inject(UserService);

    loaderService.show();

    // אם ה-ID לא תקין או חסר, החזר null
    if (!id || id.trim() === '') {
        console.warn('Invalid or missing ID in route params');
        loaderService.hide();
        return of(null);
    }

    // הבאת המשתמש לפי ה-ID
    return userService.getUserById(id).pipe(
        delay(250), // סימולציה של טעינה (לא חובה)
        catchError(error => {
            console.error('Error fetching user:', error);
            return of(null); // החזרת null במקרה של שגיאה
        }),
        finalize(() => loaderService.hide())
    );
};

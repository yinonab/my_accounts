import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, throwError, tap, catchError, map, switchMap, pipe, retry, take } from 'rxjs';
import { User } from '../models/user.model.ts';
import { storageService } from './async-storage.service'; // Replace with your async storage service
import { CloudinaryService } from './cloudinary.service';


const ENTITY_AUTH = 'auth';
const ENTITY = 'user';
const LOGGEDIN_USER = 'loggedInUser';
const FACEBOOK_ID = 'facebookId';
const FACEBOOK_ACCESS_TOKEN = 'facebookAccessToken';



@Injectable({
  providedIn: 'root'
})
export class UserService {
  private _users$ = new BehaviorSubject<User[]>([]);
  public users$ = this._users$.asObservable();

  private _filterBy$ = new BehaviorSubject<string>(''); // פילטר למשתמשים
  public filterBy$ = this._filterBy$.asObservable();

  private _loggedInUser$ = new BehaviorSubject<User | null>(null);
  public loggedInUser$ = this._loggedInUser$.asObservable();

  constructor(private cloudinaryService: CloudinaryService) {
    // Initialize users in local storage if not present
    // const users = JSON.parse(localStorage.getItem(ENTITY) || 'null');
    // if (!users || users.length === 0) {
    //   localStorage.setItem(ENTITY, JSON.stringify(this._createDemoUsers()));
    // }
    this._loadUsersFromDB();
    const loggedInUser = JSON.parse(localStorage.getItem(LOGGEDIN_USER) || 'null');
    if (loggedInUser) this._loggedInUser$.next(loggedInUser);
  }
  /** טוען את רשימת המשתמשים מהדאטה בייס */
  private _loadUsersFromDB(): void {
    from(storageService.query<User>(ENTITY))
      .pipe(
        tap(users => {
          this._users$.next(this._sort(users));
        }),
        catchError(this._handleError)
      )
      .subscribe();
  }

  // public login(username: string, password: string): Observable<User> {
  //   return from(storageService.query<User>(ENTITY)).pipe(
  //     map(users => {
  //       const user = users.find(u => u.username === username && u.password === password);
  //       if (!user) {
  //         throw new Error('Invalid username or password');
  //       }
  //       this._loggedInUser$.next(user);
  //       localStorage.setItem(LOGGEDIN_USER, JSON.stringify(user));
  //       return user;
  //     }),
  //     catchError(this._handleError)
  //   );
  // }

  public login(username: string, password: string): Observable<User> {
    const loginData = { username, password }; // Prepare login payload
    return from(storageService.login<User>('auth/login', loginData)).pipe(
      tap((loggedInUser: User) => {
        // Update logged-in user BehaviorSubject and localStorage
        this._loggedInUser$.next(loggedInUser);
        localStorage.setItem(LOGGEDIN_USER, JSON.stringify(loggedInUser));
      }),
      catchError(this._handleError) // Handle errors
    );
  }

  public loginWithFacebook(fbUser: {
    facebookId: string;
    name: string;
    email?: string;
    accessToken: string;
  }): Observable<User> {
    return from(storageService.login<User>('auth/facebook', fbUser)).pipe(
      tap((loggedInUser: User) => {
        // Save the user as the currently logged-in user
        this._loggedInUser$.next(loggedInUser)
        localStorage.setItem(LOGGEDIN_USER, JSON.stringify(loggedInUser))
        localStorage.setItem(FACEBOOK_ID, fbUser.facebookId);
        localStorage.setItem(FACEBOOK_ACCESS_TOKEN, fbUser.accessToken);
      }),
      catchError(this._handleError)
    )
  }









  // Logout method
  public logout(): void {
    this._loggedInUser$.next(null);
    localStorage.removeItem(LOGGEDIN_USER);
    localStorage.removeItem(FACEBOOK_ID);
    localStorage.removeItem(FACEBOOK_ACCESS_TOKEN);
  }

  // Get logged-in user from local storage
  public getLoggedInUser(): User | null {
    return JSON.parse(localStorage.getItem(LOGGEDIN_USER) || 'null');
  }

  // Load users from storage and apply sorting
  // public loadUsers(): Observable<User[]> {
  //   return from(storageService.query<User>(ENTITY)).pipe(
  //     tap(users => {
  //       this._users$.next(this._sort(users));
  //     }),
  //     catchError(this._handleError)
  //   );
  // }

  /** טוען משתמשים עם תמיכה בפילטר */
  public loadUsers(): Observable<User[]> {
    return from(storageService.query<User>(ENTITY))
      .pipe(
        map(users => {
          const filterBy = this._filterBy$.value.toLowerCase();
          return users.filter(user => user.username.toLowerCase().includes(filterBy));
        }),
        tap(users => this._users$.next(users)),
        retry(3),
        catchError(this._handleError)
      );
  }

  // Save a user (add or update)
  public saveUser(user: User): Observable<User> {
    return user._id ? this._updateUser(user) : this._addUser(user);
  }

  /** מסנן את המשתמשים לפי שם */
  public setFilterBy(filterBy: string) {
    this._filterBy$.next(filterBy);
    this.loadUsers().pipe(take(1)).subscribe();
  }

  // Delete a user by ID
  public deleteUser(userId: string): Observable<void> {
    return from(storageService.remove(ENTITY, userId)).pipe(
      tap(() => {
        const users = this._users$.value.filter(user => user._id !== userId);
        this._users$.next(users);
      }),
      retry(2),
      catchError(this._handleError)
    );
  }

  // Get a single user by ID
  // public getUserById(userId: string): Observable<User> {
  //   return from(storageService.get<User>(ENTITY, userId)).pipe(
  //     catchError(this._handleError)
  //   );
  // }

  public getUserById(userId: string): Observable<User> {
    return from(storageService.get<User>(ENTITY, userId))
      .pipe(
        retry(3),
        catchError(this._handleError)
      );
  }

  // Get an empty user structure
  // Get an empty user structure
  public getEmptyUser(): User {
    return {
      _id: '', // Default ID is empty for new users
      username: '',
      password: '',
      email: '',
      createdAt: new Date(),
      img: '',
      isAdmin: false
    };
  }


  // Create demo users for initialization
  private _createDemoUsers(): User[] {
    return [
      {
        _id: this._getRandomId(),
        username: 'john_doe',
        password: '12345',
        email: 'john.doe@example.com',
        createdAt: new Date('2020-01-01'),
        img: '',
        isAdmin: false
      },
      {
        _id: this._getRandomId(),
        username: 'jane_smith',
        password: 'password',
        email: 'jane.smith@example.com',
        createdAt: new Date('2021-01-01'),
        img: '',
        isAdmin: false
      }
    ];
  }

  // Sort users by username
  private _sort(users: User[]): User[] {
    return users.sort((a, b) => a.username.localeCompare(b.username));
  }

  // Add a new user
  private _addUser(user: User): Observable<User> {
    const newUser = { ...user, _id: this._getRandomId() }; // Ensure `_id` is assigned
    return from(storageService.post('auth/signup', newUser)).pipe(
      tap(savedUser => {
        const users = this._users$.value;
        this._users$.next([...users, savedUser]); // Update users BehaviorSubject
      }),
      retry(3),
      catchError(this._handleError)
    );
  }


  // Update an existing user
  private _updateUser(user: User): Observable<User> {
    return from(storageService.put(ENTITY, user)).pipe(
      tap(updatedUser => {
        const users = this._users$.value.map(u =>
          u._id === updatedUser._id ? updatedUser : u
        );
        this._users$.next(users);
      }),
      retry(3),
      catchError(this._handleError)
    );
  }
  public setLoggedInUser(user: User): void {
    this._loggedInUser$.next(user); // עדכון ה-BehaviorSubject
    localStorage.setItem(LOGGEDIN_USER, JSON.stringify(user)); // עדכון ה-localStorage
  }


  // Generate a random ID
  private _getRandomId(length = 8): string {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Handle errors
  private _handleError(err: any): Observable<never> {
    console.error('An error occurred:', err);
    return throwError(() => new Error(err));
  }

  public syncLoggedInUser(): Observable<User> {
    // Get the logged-in user from local storage
    const loggedInUser = this.getLoggedInUser();

    if (!loggedInUser) {
      return throwError(() => new Error('No logged-in user found in local storage'));
    }

    // Send the logged-in user to the back-end service
    return from(storageService.put('user/updateProfile', loggedInUser)).pipe(
      tap((updatedUser: User) => {
        // Update the local logged-in user with the response from the server
        this._loggedInUser$.next(updatedUser);
        localStorage.setItem(LOGGEDIN_USER, JSON.stringify(updatedUser));
      }),
      catchError(this._handleError)
    );
  }
  public updateUserImage(file: File): Observable<User> {
    return this.cloudinaryService.uploadImage(file).pipe(
      switchMap((imageUrl: string) => {
        console.log('Image URL from Cloudinary:', imageUrl); // בדוק את ה-URL

        const loggedInUser = this.getLoggedInUser();
        if (!loggedInUser) {
          return throwError(() => new Error('No logged-in user found. Please log in.'));
        }

        // עדכון נתוני המשתמש
        const updatedUser: User = { ...loggedInUser, img: imageUrl };

        return this.saveUser(updatedUser).pipe(
          tap((savedUser) => {
            console.log('Updated user sent to the server:', savedUser);
            this.setLoggedInUser(savedUser); // שימוש בפונקציה החדשה
          })
        );
      }),
      catchError((err) => {
        console.error('Error updating user image:', err.message || err);
        return throwError(() => new Error('Failed to update user image. Please try again later.'));
      })
    );
  }
}

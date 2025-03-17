import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, throwError, tap, catchError, map, switchMap, pipe, retry, take } from 'rxjs';
import { User } from '../models/user.model.ts';
import { storageService } from './async-storage.service'; // Replace with your async storage service
import { CloudinaryService } from './cloudinary.service';
import { SocketService } from './socket.service.js';
import { config } from './config.service';



const ENTITY_AUTH = 'auth';
const ENTITY = 'user';
const LOGGEDIN_USER = 'loggedInUser';
const FACEBOOK_ID = 'facebookId';
const FACEBOOK_ACCESS_TOKEN = 'facebookAccessToken';
const LOGIN_TOKEN = 'loginTokenBackup';



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

  constructor(private cloudinaryService: CloudinaryService, private socketService: SocketService) {
    // Initialize users in local storage if not present
    // const users = JSON.parse(localStorage.getItem(ENTITY) || 'null');
    // if (!users || users.length === 0) {
    //   localStorage.setItem(ENTITY, JSON.stringify(this._createDemoUsers()));
    // }
    this._restoreLoginToken(); // 🟢 שחזור טוקן אם הקוקי נמחק
    this._loadUsersFromDB();
    this._loadLoggedInUser();
    this.setupTokenRecoveryListener();
    const loggedInUser = JSON.parse(localStorage.getItem(LOGGEDIN_USER) || 'null');
    if (loggedInUser && loggedInUser._id) {
      this._loggedInUser$.next(loggedInUser);
      this.socketService.setup(); // מבצע חיבור ל-Socket רק אם יש משתמש מחובר
    }
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
  /** 🟢 טעינת המשתמש המחובר */
  private _loadLoggedInUser(): void {
    const loggedInUser = JSON.parse(localStorage.getItem(LOGGEDIN_USER) || 'null');
    if (loggedInUser && loggedInUser._id) {
      this._loggedInUser$.next(loggedInUser);
      this.socketService.setup(); // חיבור ל-Socket אם יש משתמש מחובר
    }
  }
  // Get logged-in user from local storage
  public getLoggedInUser(): User | null {
    return JSON.parse(localStorage.getItem(LOGGEDIN_USER) || 'null');
  }
  /** 🟢 שמירת המשתמש המחובר והטוקן */
  public setLoggedInUser(user: User, token: string): void {
    this._loggedInUser$.next(user);
    localStorage.setItem(LOGGEDIN_USER, JSON.stringify(user));
    this._saveLoginToken(token);
    this.socketService.login(user._id);
  }

  // public setLoggedInUser(user: User): void {
  //   this._loggedInUser$.next(user); // עדכון ה-BehaviorSubject
  //   localStorage.setItem(LOGGEDIN_USER, JSON.stringify(user)); // עדכון ה-localStorage
  // }
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

  /** 🔄 שמירת ה-`loginToken` גם בקוקי וגם בגיבוי `localStorage` */
  private _saveLoginToken(token: string): void {
    document.cookie = `loginToken=${token}; path=/; Secure; SameSite=Lax; max-age=${30 * 24 * 60 * 60}`;
    localStorage.setItem(LOGIN_TOKEN, token);
    sessionStorage.setItem(LOGIN_TOKEN, token);

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SAVE_LOGIN_TOKEN', token });
      console.log("💾 נשלחה הודעה ל-Service Worker לשמירת token ב־IndexedDB");
    }
  }

  /** 🔄 שחזור `loginToken` אם הקוקי נמחק */
  // private _restoreLoginToken(): void {
  //   const tokenFromCookie = this.getCookie("loginToken");
  //   if (!tokenFromCookie) {
  //     const backupToken = localStorage.getItem(LOGIN_TOKEN);
  //     if (backupToken) {
  //       console.log("🔄 משחזר `loginToken` מה-LocalStorage...");
  //       this._saveLoginToken(backupToken);
  //     } else {
  //       console.warn("❌ לא נמצא Token לשחזור");
  //     }
  //   }
  // }
  /** 🔄 שחזור `loginToken` ממקור זמין */
  private _restoreLoginToken(): void {
    let token = this.getCookie("loginToken") ||
      sessionStorage.getItem(LOGIN_TOKEN) ||
      sessionStorage.getItem("loginTokenBackup") ||
      localStorage.getItem(LOGIN_TOKEN) ||
      localStorage.getItem("loginTokenBackup");

    if (!token) {
      console.warn("❌ לא נמצא Token לשחזור – יש להתחבר מחדש");
      return;
    }

    console.log("🔄 משחזר את `loginToken` ממקור זמין:", token);
    this._saveLoginToken(token);
    console.log("👤 משתמש מחובר כרגע:", this._loggedInUser$.value);

  }


  /** 🔥 האזנה לחזרת המשתמש לאפליקציה ושחזור `loginToken` */
  public setupTokenRecoveryListener(): void {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        console.log("🔄 האפליקציה חזרה לפוקוס – בודק תוקף `loginToken`...");
        this.refreshLoginTokenIfNeeded();
      }
    });
  }
  /** 🟢 שליפת `loginToken` מהקוקי */
  getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  /** 🟢 בדיקה אם צריך לשחזר `loginToken` */
  public refreshLoginTokenIfNeeded(): void {
    let token = this.getCookie("loginToken") ||
      sessionStorage.getItem(LOGIN_TOKEN) ||
      sessionStorage.getItem("loginTokenBackup") ||
      localStorage.getItem(LOGIN_TOKEN) ||
      localStorage.getItem("loginTokenBackup");

    console.log("🔍 נבדקו מקורות הטוקן:");
    console.log("🍪 קוקי:", this.getCookie("loginToken"));
    console.log("📦 SessionStorage:", sessionStorage.getItem("loginToken"));
    console.log("📦 SessionStorage (Backup):", sessionStorage.getItem("loginTokenBackup"));
    console.log("💾 LocalStorage:", localStorage.getItem(LOGIN_TOKEN));
    console.log("💾 LocalStorage (Backup):", localStorage.getItem("loginTokenBackup"));

    if (!token) {
      console.warn("❌ לא נמצא Token לשחזור – יש להתחבר מחדש");
    } else {
      console.log("✅ Token משוחזר בהצלחה:", token);
    }
  }
  public restoreLoginToken(token: string): void {
    if (!token) {
      console.warn("❌ לא התקבל Token לשחזור");
      return;
    }
    console.log("🔄 משחזר את ה-Token:", token);
    this._saveLoginToken(token);
  }
  public keepSessionAlive(): void {
    fetch(`${config.baseURL}/auth/ping`, { method: 'GET', credentials: 'include' })
      .then(response => console.log("✅ Keep-Alive Ping הצליח"))
      .catch(error => console.warn("⚠️ Keep-Alive Ping נכשל", error));
  }


  // public login(username: string, password: string): Observable<User> {
  //   const loginData = { username, password }; // Prepare login payload
  //   return from(storageService.login<User>('auth/login', loginData)).pipe(
  //     tap((loggedInUser: User) => {
  //       // Update logged-in user BehaviorSubject and localStorage
  //       this._loggedInUser$.next(loggedInUser);
  //       localStorage.setItem(LOGGEDIN_USER, JSON.stringify(loggedInUser));
  //       this.socketService.login(loggedInUser._id);
  //     }),
  //     catchError(this._handleError) // Handle errors
  //   );
  // }
  public login(email: string, password: string): Observable<User> {
    const loginData = { email, password };

    return from(storageService.login<{ user: User, loginToken: string }>('auth/login', loginData)).pipe(
      tap((response) => {
        const loggedInUser: User = response.user; // ✅ שמירת המשתמש
        const loginToken: string = response.loginToken; // ✅ שמירת ה־Token

        // ✅ שמירה על הלוגיקה המקורית שלך
        this._loggedInUser$.next(loggedInUser);
        localStorage.setItem(LOGGEDIN_USER, JSON.stringify(loggedInUser));
        this.socketService.login(loggedInUser._id);

        // ✅ הוספת שמירת ה־`loginToken`
        this._saveLoginToken(loginToken);
      }),
      map(response => response.user), // 🟢 ממיר את הפלט כך שיחזור רק `User`
      catchError(this._handleError)
    );
  }


  // public loginWithFacebook(fbUser: {
  //   facebookId: string;
  //   name: string;
  //   email?: string;
  //   accessToken: string;
  // }): Observable<User> {
  //   return from(storageService.login<User>('auth/facebook', fbUser)).pipe(
  //     tap((loggedInUser: User) => {
  //       // Save the user as the currently logged-in user
  //       this._loggedInUser$.next(loggedInUser)
  //       localStorage.setItem(LOGGEDIN_USER, JSON.stringify(loggedInUser))
  //       localStorage.setItem(FACEBOOK_ID, fbUser.facebookId);
  //       localStorage.setItem(FACEBOOK_ACCESS_TOKEN, fbUser.accessToken);
  //       this.socketService.login(loggedInUser._id);
  //     }),
  //     catchError(this._handleError)
  //   )
  // }
  public loginWithFacebook(fbUser: {
    facebookId: string;
    name: string;
    email?: string;
    accessToken: string;
  }): Observable<User> {
    console.log("🔹 Sending Facebook user data to backend:", fbUser);
    return from(storageService.login<{ user: User; loginToken: string }>('auth/facebook', fbUser)).pipe(
      tap((response) => {
        console.log("✅ Server response:", response);
        if (!response || !response.user || !response.loginToken) {
          console.error("❌ Error: No user or loginToken received from server!");
          return;
      }
        const loggedInUser: User = response.user;
        const loginToken: string = response.loginToken;
        // שמירת המשתמש ב־BehaviorSubject וב־localStorage
        this._loggedInUser$.next(loggedInUser);
        localStorage.setItem(LOGGEDIN_USER, JSON.stringify(loggedInUser));
        // שמירת פרטי פייסבוק
        localStorage.setItem(FACEBOOK_ID, fbUser.facebookId);
        localStorage.setItem(FACEBOOK_ACCESS_TOKEN, fbUser.accessToken);
        // התחברות דרך Socket
        this.socketService.login(loggedInUser._id);
        // שמירת ה־loginToken (גיבוי ב-cookie, localStorage ו-sessionStorage)
        this._saveLoginToken(loginToken);
        console.log("✅ LoginToken saved:", loginToken);
      }),
      map(response => response.user),
      catchError(this._handleError)
    );
  }










  // Logout method
  public logout(): void {
    this._loggedInUser$.next(null);
    localStorage.removeItem(LOGGEDIN_USER);
    localStorage.removeItem(FACEBOOK_ID);
    localStorage.removeItem(FACEBOOK_ACCESS_TOKEN);
    localStorage.removeItem(LOGIN_TOKEN);
    this.socketService.logout();
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
            this.setLoggedInUser(savedUser, this.getCookie("loginToken") || '');
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

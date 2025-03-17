import { Component, inject, OnDestroy } from '@angular/core';
import { User } from '../../models/user.model.ts';
import { BitCoinService } from '../../services/bit-coin.service.js';
import { Observable, Subscription, take } from 'rxjs';
import { UserService } from '../../services/user.service.js';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { FacebookService } from '../../services/FacebookService.js';
import { Contact } from '../../models/contact.model.js';
import { ContactService } from '../../services/contact.service.js';
import { MsgService } from '../../services/msg.service.js';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core'; // 🔹 הוספה חדשה


declare var FB: any;
@Component({
  selector: 'home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  animations: [
    trigger('bounceArrow', [
      state('up', style({
        transform: 'translateY(-10px)'
      })),
      state('down', style({
        transform: 'translateY(10px)'
      })),
      transition('up <=> down', [
        animate('1s cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ])
  ]
})
export class HomePageComponent implements OnDestroy {
  user!: User
  bitCoinService = inject(BitCoinService)
  userService = inject(UserService)
  logdinUser = this.userService.getLoggedInUser();
  contactService = inject(ContactService);
  contacts$!: Observable<Contact[]>;
  errorMessage: string = '';

  BitCoinRate!: number
  subscription!: Subscription

  arrowState: 'up' | 'down' = 'up';
  private animationInterval: any;


  constructor(private facebookService: FacebookService, private msgService: MsgService, private router: Router) {
    this.user = this.userService.getEmptyUser() as User
    this.getBitcoinRate();
  }

  ngOnInit() {
    this.startArrowAnimation();
  }

  public getFacebookToken(contact: Contact): string | null {
    if (!contact.facebookToken) {
      console.error('Token not available for this contact:', contact.name);
      return null;
    }
    return contact.facebookToken;
  }
  // public loginWithFacebook(): void {
  //   this.facebookService.login().then(
  //     (authResponse) => {
  //       const accessToken = authResponse.accessToken;

  //       // Next: Use FB.api to fetch user details:
  //       FB.api('/me', { fields: 'id,name,email' }, (userInfo: any) => {
  //         if (!userInfo || userInfo.error) {
  //           console.error('Failed to fetch user info from Facebook:', userInfo?.error);
  //           this.errorMessage = 'Failed to fetch Facebook user info.';
  //           return;
  //         }
  //         console.log('Fetched user info:', userInfo);

  //         // 1. Build an object with everything we need:
  //         const fbUser = {
  //           facebookId: userInfo.id,
  //           name: userInfo.name,
  //           email: userInfo.email,
  //           accessToken
  //         };

  //         // 2. Call our new userService.loginWithFacebook(fbUser):
  //         this.userService.loginWithFacebook(fbUser).subscribe({
  //           next: (loggedInUser) => {
  //             console.log('User logged in via Facebook:', loggedInUser);
  //             //localStorage.setItem('facebookId', fbUser.facebookId);

  //             //localStorage.setItem('facebookAccessToken', fbUser.accessToken);
  //             // Show success message:
  //             this.msgService.setSuccessMsg(`Login successful!!! ${loggedInUser.username} is now logged in.`);
  //             // Navigate to '/contact':
  //             this.router.navigate(['/contact']);
  //             // Optionally navigate somewhere, show success, etc.
  //           },
  //           error: (err) => {
  //             console.error('Failed to log in with Facebook on the backend:', err);
  //             this.errorMessage = err.message || 'Facebook login failed.';
  //             this.msgService.setErrorMsg(this.errorMessage);
  //           }
  //         });
  //       });
  //     },
  //     (error) => {
  //       console.error('Facebook login failed:', error);
  //       this.errorMessage = 'Facebook login popup was closed or did not authorize.';
  //       this.msgService.setErrorMsg(this.errorMessage);
  //     }
  //   );
  // }
//   public async loginWithFacebook(): Promise<void> {
//     try {
//       const fbUser = await this.facebookService.login(); // 🔹 עדכון: שימוש בשירות שמזהה אוטומטית את הפלטפורמה

//       if (!fbUser) {
//         this.errorMessage = 'Facebook login failed.';
//         this.msgService.setErrorMsg(this.errorMessage);
//         return;
//       }

//       console.log('🔹 Facebook login successful:', fbUser);

//       // 🔹 אם מדובר בדפדפן, יש צורך לקרוא ל-FB.api כדי לקבל את פרטי המשתמש
//       if (!Capacitor.isNativePlatform()) {
//         FB.api('/me', { fields: 'id,name,email' }, (userInfo: any) => {
//           console.log("🔹 Fetched user info from Facebook API:", userInfo);
//           if (!userInfo || userInfo.error) {
//             console.error('Failed to fetch user info from Facebook:', userInfo?.error);
//             this.errorMessage = 'Failed to fetch Facebook user info.';
//             this.msgService.setErrorMsg(this.errorMessage);
//             return;
//           }

//           console.log('🔹 Fetched user info from Facebook API:', userInfo);

//           const userData = {
//             facebookId: userInfo.id || '',  // 🔹 הוספת ערך ברירת מחדל
//             name: userInfo.name || '',      // 🔹 הוספת ערך ברירת מחדל
//             email: userInfo.email || '',    // 🔹 הוספת ערך ברירת מחדל
//             accessToken: fbUser.accessToken
//         };

//         this.authenticateUser(userData);
//     });
// } else {
//     // 🔹 במצב נייטיב, אין גישה ישירה ל-FB API ולכן נשאיר את הפרטים ריקים (לא `null`).
//     const userData = {
//         facebookId: '',  // 🔹 ברירת מחדל ריקה
//         name: '',        // 🔹 ברירת מחדל ריקה
//         email: '',       // 🔹 ברירת מחדל ריקה
//         accessToken: fbUser.accessToken
//     };

//     this.authenticateUser(userData);
// }
// } catch (error) {
// console.error('Facebook login failed:', error);
// this.errorMessage = 'Facebook login failed.';
// this.msgService.setErrorMsg(this.errorMessage);
// }
// }

// public async loginWithFacebook(): Promise<void> {
//   try {
//       // 🔹 שליפת טוקן שמור אם קיים
//       let existingToken = await this.facebookService.getLoginToken();

//       if (existingToken) {
//           console.log("🔹 Using existing Facebook token:", existingToken);

//           try {
//               // 🔹 ניסיון לאחזר נתוני משתמש עם הטוקן הקיים
//               const userData = await this.facebookService.fetchFacebookUserData(existingToken);
//               console.log("✅ Successfully retrieved user data from stored token:", userData);

//               // ✅ אימות המשתמש במערכת שלנו
//               this.authenticateUser(userData);
//               return;
//           } catch (fetchError) {
//               console.warn("⚠️ Failed to fetch user data with stored token. Token might be expired.");
//               existingToken = null; // מאפסים את הטוקן כדי לנסות להתחבר מחדש
//           }
//       }

//       // אם אין טוקן תקף – נבצע התחברות
//       console.log("🔹 No valid stored token found. Proceeding with Facebook login...");
//       const fbUser = await this.facebookService.login();

//       if (!fbUser || !fbUser.accessToken) {
//           this.errorMessage = 'Facebook login failed.';
//           this.msgService.setErrorMsg(this.errorMessage);
//           return;
//       }

//       console.log('✅ Facebook login successful:', fbUser);

//       let userData: { facebookId: string, name: string, email?: string, accessToken: string }; // 🔹 הגדרת הטיפוס!

//       if (!Capacitor.isNativePlatform()) {
//           // 🔹 אם מדובר בדפדפן, משתמשים ב-FB.api כדי לקבל נתונים
//           userData = await new Promise((resolve, reject) => {
//               FB.api('/me', { fields: 'id,name,email' }, (userInfo: any) => {
//                   if (!userInfo || userInfo.error) {
//                       console.error('❌ Failed to fetch user info from Facebook API:', userInfo?.error);
//                       this.errorMessage = 'Failed to fetch Facebook user info.';
//                       this.msgService.setErrorMsg(this.errorMessage);
//                       reject('Failed to fetch user info.');
//                       return;
//                   }

//                   console.log('🔹 Fetched user info from Facebook API:', userInfo);

//                   resolve({
//                       facebookId: userInfo.id || '',
//                       name: userInfo.name || '',
//                       email: userInfo.email || '',
//                       accessToken: fbUser.accessToken
//                   } as { facebookId: string, name: string, email?: string, accessToken: string }); // 🔹 שימוש ב-`as`
//               });
//           });
//       } else {
//           // 🔹 אם מדובר באפליקציה נייטיבית – משתמשים בנתוני טוקן בלבד
//           userData = {
//               facebookId: '',
//               name: '',
//               email: '',
//               accessToken: fbUser.accessToken
//           };
//       }

//       // 🔹 שמירת הטוקן באופן יזום
//       await this.facebookService.saveLoginToken(userData.accessToken);
//       console.log("✅ Token saved successfully before authentication.");
//       const storedToken = await this.facebookService.getLoginToken();
//       console.log("🔍 Token after saving:", storedToken);

//       // 🔹 ביצוע אימות מול השרת
//       this.authenticateUser(userData);

//   } catch (error) {
//       console.error('❌ Facebook login failed:', error);
//       this.errorMessage = 'Facebook login failed.';
//       this.msgService.setErrorMsg(this.errorMessage);
//   }
// }


private async waitForToken(retries: number = 5, delay: number = 45000): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
      const token = await this.facebookService.getLoginToken();
      if (token) {
          console.log(`✅ Token retrieved successfully after ${attempt} attempts:`, token);
          return token;
      }
      console.warn(`⚠️ Attempt ${attempt}/${retries}: Token not ready yet. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay)); // המתנה לפני ניסיון נוסף
  }
  console.error("❌ All retry attempts failed – no valid token retrieved.");
  return null;
}

public async loginWithFacebook(): Promise<void> {
  try {
      console.log("🔄 Checking existing Facebook token...");
      let existingToken = await this.facebookService.getLoginToken();

      if (existingToken) {
          console.log("🔹 Using existing Facebook token:", existingToken);

          try {
              const userData = await this.facebookService.fetchFacebookUserData(existingToken);
              console.log("✅ Successfully retrieved user data from stored token:", userData);
              this.authenticateUser(userData);
              return;
          } catch (fetchError) {
              console.warn("⚠️ Failed to fetch user data with stored token. Token might be expired.");
              existingToken = null;
          }
      }

      console.log("🔹 No valid stored token found. Proceeding with Facebook login...");
      const fbUser = await this.facebookService.login();

      if (!fbUser || !fbUser.accessToken) {
          this.errorMessage = 'Facebook login failed.';
          this.msgService.setErrorMsg(this.errorMessage);
          return;
      }

      console.log('✅ Facebook login successful:', fbUser);

      // 🔹 שמירת הטוקן
      await this.facebookService.saveLoginToken(fbUser.accessToken);
      console.log("✅ Token saved successfully before authentication.");

      // 🔄 המתנה עד שהטוקן יהיה זמין
      const storedToken = await this.waitForToken();
      if (!storedToken) {
          console.warn("❌ Token was not retrieved successfully after retries.");
          return;
      }

      // 🔄 שליפת נתוני משתמש
      const userData = await this.facebookService.fetchFacebookUserData(storedToken);
      console.log("✅ Retrieved user data:", userData);

      // 🔹 ביצוע אימות מול השרת
      this.authenticateUser(userData);

  } catch (error) {
      console.error('❌ Facebook login failed:', error);
      this.errorMessage = 'Facebook login failed.';
      this.msgService.setErrorMsg(this.errorMessage);
  }
}

  /**
   * שולח את נתוני המשתמש לשרת לאימות ושמירה במערכת
   */
  private authenticateUser(userData: { facebookId: string, name: string, email?: string, accessToken: string }): void {
    console.log("🔹 Sending user data to backend:", userData);

    this.userService.loginWithFacebook(userData).subscribe({
        next: async (loggedInUser) => {
            console.log('✅ User logged in via Facebook:', loggedInUser);

            // 🔹 שומרים את הטוקן באופן יזום לפני המעבר לעמוד אחר
            await this.facebookService.saveLoginToken(userData.accessToken);
            console.log("✅ Token saved before navigation");
            const storedToken = await this.facebookService.getLoginToken();
            console.log("🔍 Token after saving:", storedToken);

            this.msgService.setSuccessMsg(`Login successful! ${loggedInUser.username} is now logged in.`);
            
            setTimeout(() => {  // מחכים רגע לפני הניווט כדי לוודא שהטוקן נשמר
                this.router.navigate(['/contact']);
            }, 500);
        },
        error: (err) => {
            console.error('❌ Failed to log in with Facebook on the backend:', err);
            this.errorMessage = err.message || 'Facebook login failed.';
            this.msgService.setErrorMsg(this.errorMessage);
        }
    });
}





  startArrowAnimation() {
    this.animationInterval = setInterval(() => {
      this.arrowState = this.arrowState === 'up' ? 'down' : 'up';
    }, 1000);
  }

  onAnimationDone() {
    // Optional: Add any logic you want to execute when animation completes
  }

  getBitcoinRate(): void {
    this.subscription = this.bitCoinService.getBitCoinRate()
      .pipe(take(1))
      .subscribe(rate => {
        this.BitCoinRate = rate
      })
  }

  ngOnDestroy(): void {
    if (this.subscription) this.subscription.unsubscribe();
    if (this.animationInterval) clearInterval(this.animationInterval);
  }
}

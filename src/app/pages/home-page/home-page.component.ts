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
  public loginWithFacebook(): void {
    this.facebookService.login().then(
      (authResponse) => {
        const accessToken = authResponse.accessToken;

        // Next: Use FB.api to fetch user details:
        FB.api('/me', { fields: 'id,name,email' }, (userInfo: any) => {
          if (!userInfo || userInfo.error) {
            console.error('Failed to fetch user info from Facebook:', userInfo?.error);
            this.errorMessage = 'Failed to fetch Facebook user info.';
            return;
          }
          console.log('Fetched user info:', userInfo);

          // 1. Build an object with everything we need:
          const fbUser = {
            facebookId: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
            accessToken
          };

          // 2. Call our new userService.loginWithFacebook(fbUser):
          this.userService.loginWithFacebook(fbUser).subscribe({
            next: (loggedInUser) => {
              console.log('User logged in via Facebook:', loggedInUser);
              //localStorage.setItem('facebookId', fbUser.facebookId);

              //localStorage.setItem('facebookAccessToken', fbUser.accessToken);
              // Show success message:
              this.msgService.setSuccessMsg(`Login successful!!! ${loggedInUser.username} is now logged in.`);
              // Navigate to '/contact':
              this.router.navigate(['/contact']);
              // Optionally navigate somewhere, show success, etc.
            },
            error: (err) => {
              console.error('Failed to log in with Facebook on the backend:', err);
              this.errorMessage = err.message || 'Facebook login failed.';
              this.msgService.setErrorMsg(this.errorMessage);
            }
          });
        });
      },
      (error) => {
        console.error('Facebook login failed:', error);
        this.errorMessage = 'Facebook login popup was closed or did not authorize.';
        this.msgService.setErrorMsg(this.errorMessage);
      }
    );
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

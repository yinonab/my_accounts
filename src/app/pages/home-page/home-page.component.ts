import { Component, inject, OnDestroy } from '@angular/core';
import { User } from '../../models/user.model.ts';
import { BitCoinService } from '../../services/bit-coin.service.js';
import { Subscription, take } from 'rxjs';
import { UserService } from '../../services/user.service.js';
import { animate, state, style, transition, trigger } from '@angular/animations';

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

  BitCoinRate!: number
  subscription!: Subscription

  arrowState: 'up' | 'down' = 'up';
  private animationInterval: any;


  constructor() {
    this.user = this.userService.getEmptyUser() as User
    this.getBitcoinRate();
  }

  ngOnInit() {
    this.startArrowAnimation();
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

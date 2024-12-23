import { Component, inject, OnDestroy } from '@angular/core';
import { User } from '../../models/user.model.ts';
import { BitCoinService } from '../../services/bit-coin.service.js';
import { Subscription, take } from 'rxjs';
import { UserService } from '../../services/user.service.js';

@Component({
  selector: 'home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnDestroy {
  user!: User
  bitCoinService = inject(BitCoinService)
  userService = inject(UserService)

  BitCoinRate!: number 
  subscription!: Subscription

  constructor() {
    this.user = this.userService.getEmptyUser() as User
    this.getBitcoinRate();
  }

  getBitcoinRate(): void {
    this.subscription = this.bitCoinService.getBitCoinRate()
      .pipe(take(1))
      .subscribe(rate => {
        this.BitCoinRate = rate
      })
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe?.()
  }
}

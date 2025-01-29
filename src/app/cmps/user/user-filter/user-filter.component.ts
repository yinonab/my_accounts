import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Subject, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'user-filter',
  templateUrl: './user-filter.component.html',
  styleUrls: ['./user-filter.component.scss']
})
export class UserFilterComponent implements OnInit {
  userService = inject(UserService);
  filterBy = '';
  filterSubject$ = new Subject<string>();
  destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.userService.filterBy$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(filterBy => {
        this.filterBy = filterBy;
      });

    this.filterSubject$
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.userService.setFilterBy(this.filterBy);
      });
  }

  onSetFilter(val: string) {
    this.filterSubject$.next(val);
  }

  onClearFilter() {
    this.filterBy = '';
    this.onSetFilter('');
  }
}

import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { LoaderService } from '../services/loaderService/loader.service';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss'],
})
export class LoaderComponent implements OnInit {
  isLoading!: Observable<boolean>;

  constructor(private loaderService: LoaderService) { }

  ngOnInit(): void {
    this.isLoading = this.loaderService.isLoading$; // האתחול קורה אחרי שהקונסטרקטור רץ
  }
}

import { Component } from '@angular/core';
import { LoaderService } from '../services/loaderService/loader.service';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss'],
})
export class LoaderComponent {
  isLoading = this.loaderService.isLoading$;

  constructor(private loaderService: LoaderService) {}
}

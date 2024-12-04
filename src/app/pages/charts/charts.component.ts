import { Component, inject, OnDestroy, ViewChild } from '@angular/core';
import { BitCoinService } from '../../services/bit-coin.service';
import { MarketPlace } from '../../models/bit-coin';
import { Subscription, take } from 'rxjs';
import { Chart, ChartConfiguration, ChartEvent, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import Annotation from 'chartjs-plugin-annotation';
@Component({
  selector: 'charts',
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss'
})
export class ChartsComponent implements OnDestroy {
  bitCoinService = inject(BitCoinService)
  values!: { x: number, y: number }[]
  subscription!: Subscription

  constructor() {
    Chart.register(Annotation);
  }

  ngOnInit() {
    this.getMaketPlace()
  }
  
  getMaketPlace(): void {
    this.subscription = this.bitCoinService.getMarketPlace()
      .pipe(take(1))
      .subscribe(data => {
        this.values = data.values
        this.lineChartData.datasets[0].data = this.values.map((item: any) => item.y)
        this.lineChartData.labels = this.values.map((item: any) => item.x.toString())
      })
  }
  
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      label: 'Market Price (USD)',
      fill: true,
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }],
    labels: []
  }

  public lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.5,
      },
    },
    scales: {
      y: {
        position: 'left',
      },
      y1: {
        position: 'right',
        grid: {
          color: 'rgba(255,0,0,0.3)',
        },
        ticks: {
          color: 'red',
        },
      },
    },
    plugins: {
      annotation: {}
    }
  };

  public lineChartType: ChartType = 'line';

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  ngOnDestroy(): void {
    this.subscription?.unsubscribe?.()
  }

}

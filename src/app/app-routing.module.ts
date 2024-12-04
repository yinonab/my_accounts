import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ContactIndexComponent } from './pages/contact-index/contact-index.component';
import { ContactDetailsComponent } from './pages/contact-details/contact-details.component';
import { contactResolver } from './resolvers/contact.resolver';
import { ChartsComponent } from './pages/charts/charts.component';
import { ContactEditComponent } from './pages/contact-edit/contact-edit.component';

const routes: Routes = [
  {
    path: 'contact/:id',
    component: ContactDetailsComponent,
    resolve: { contact: contactResolver }
  },
  {
    path: 'contact',
    component: ContactIndexComponent,
    children: [
      {
        path: 'edit/:id', // Edit existing contact
        component: ContactEditComponent,
        resolve: { contact: contactResolver }
      },
      {
        path: 'edit', // Create new contact
        component: ContactEditComponent
      },
    ]
  },
  
  {
    path: 'chart',
    component: ChartsComponent,
  },
  {
    path: '',
    component: HomePageComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
